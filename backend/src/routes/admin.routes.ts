import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ApiError, asyncHandler } from "../lib/errors";
import { validate, parseQueryInt } from "../middleware/validate";
import { requireAdmin } from "../middleware/auth";
import { getAdminStats } from "../services/stats.service";
import { listAllTransactions } from "../services/transaction.service";
import { User, Wallet, WalletTransaction, Transaction, ServiceProvider, ServicePackage, DataPlan, ExamPinProduct } from "../models";
import { moneyToString, generateReference, round2, escRegex } from "../lib/utils";
import { createNotification } from "../services/notification.service";
import { createAuditLog } from "../lib/audit";
import {
  adminUserStatusSchema,
  adminWalletSchema,
  adminServiceSchema,
  adminDataPlanSchema,
  adminExamPinSchema,
} from "../lib/validators";
import { decideKyc } from "../services/kyc.service";
import {
  decideAirtimeCashRequest,
  approveAirtimeCashRequest,
  rejectAirtimeCashRequest,
  beginAirtimeCashVerification,
  listAllAirtimeCashRequests,
} from "../services/airtime-cash.service";
import { getAllSystemConfig, setSystemConfig, getAirtimeCashNetworks, DEFAULT_NETWORKS } from "../services/config.service";
import { serializeAirtimeCash } from "../lib/serialize";
import { getProviderManager } from "../services/vtu";
import { routeProviders } from "../services/vtu/router";
import { getReconciliationStatus, reconcilePendingTransactions } from "../services/jobs/reconciliation";

const router = Router();
router.use(requireAdmin);

function providerJSON(p: { _id: string; category: string; name: string; code: string; description?: string | null; fee: number; isActive: boolean }) {
  return {
    id: p._id,
    category: p.category,
    name: p.name,
    code: p.code,
    description: p.description ?? null,
    fee: moneyToString(p.fee) ?? "0",
    isActive: p.isActive,
  };
}

function planJSON(p: { _id: string; network: string; planName: string; size: string; validity: string; price: number; oldPrice?: number | null; kind: string; isActive: boolean }) {
  return {
    id: p._id,
    network: p.network,
    planName: p.planName,
    size: p.size,
    validity: p.validity,
    price: moneyToString(p.price) ?? "0",
    oldPrice: moneyToString(p.oldPrice ?? null),
    kind: p.kind,
    isActive: p.isActive,
  };
}

function examProductJSON(p: { _id: string; name: string; category: string; price: number; costPrice?: number | null; description?: string | null; isActive: boolean; soldCount: number }) {
  return {
    id: p._id,
    name: p.name,
    category: p.category,
    price: moneyToString(p.price) ?? "0",
    costPrice: moneyToString(p.costPrice ?? null),
    description: p.description ?? null,
    isActive: p.isActive,
    soldCount: p.soldCount,
  };
}

// ---------- Stats ----------

router.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await getAdminStats());
  })
);

// ---------- Users ----------

router.get(
  "/users",
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseQueryInt(req.query?.page, 1);
    const pageSize = parseQueryInt(req.query?.pageSize, 20, 5, 100);
    const where: Record<string, unknown> = {};
    if (typeof req.query?.role === "string" && req.query.role !== "ALL") where.role = req.query.role;
    if (typeof req.query?.status === "string" && req.query.status !== "ALL") where.status = req.query.status;
    if (typeof req.query?.search === "string" && req.query.search.trim()) {
      const pattern = new RegExp(escRegex(req.query.search.trim()), "i");
      where.$or = [{ fullName: pattern }, { email: pattern }, { phone: pattern }];
    }
    const [users, total] = await Promise.all([
      User.find(where).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
      User.countDocuments(where),
    ]);
    const userIds = users.map((u) => String(u._id));
    const [wallets, txns] = await Promise.all([
      Wallet.find({ userId: { $in: userIds } }),
      Transaction.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
    ]);
    const walletByUser = new Map(wallets.map((w) => [String(w.userId), w]));
    const txnCountByUser = new Map(txns.map((t) => [String(t._id), Number(t.count)]));
    res.json({
      users: users.map((u) => ({
        id: u._id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        walletBalance: moneyToString(walletByUser.get(String(u._id))?.balance ?? 0) ?? "0",
        transactionCount: txnCountByUser.get(String(u._id)) ?? 0,
        createdAt: new Date(u.createdAt).toISOString(),
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

router.get(
  "/users/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const wallet = await Wallet.findOne({ userId: String(user._id) });
    const [transactions, walletTransactions] = await Promise.all([
      Transaction.find({ userId: String(user._id) }).sort({ createdAt: -1 }).limit(20),
      WalletTransaction.find({ userId: String(user._id) }).sort({ createdAt: -1 }).limit(20),
    ]);
    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        walletBalance: moneyToString(wallet?.balance ?? 0) ?? "0",
        createdAt: new Date(user.createdAt).toISOString(),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
      },
      transactions: transactions.map((t) => ({
        id: t._id,
        reference: t.reference,
        serviceType: t.serviceType,
        provider: t.provider,
        amount: moneyToString(t.amount) ?? "0",
        status: t.status,
        createdAt: new Date(t.createdAt).toISOString(),
      })),
      walletTransactions: walletTransactions.map((w) => ({
        id: w._id,
        type: w.type,
        amount: moneyToString(w.amount) ?? "0",
        status: w.status,
        reference: w.reference,
        createdAt: new Date(w.createdAt).toISOString(),
      })),
    });
  })
);

router.patch(
  "/users/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const body = req.body as Record<string, unknown>;

    if (body.status !== undefined) {
      const parsed = adminUserStatusSchema.safeParse({ status: body.status });
      if (!parsed.success) throw new ApiError(400, "Invalid status", "VALIDATION_ERROR");
      const status = parsed.data.status;
      await User.findByIdAndUpdate(userId, { $set: { status } });
      await createNotification({
        userId,
        title: status === "ACTIVE" ? "Account activated" : "Account suspended",
        message: status === "ACTIVE"
          ? "Your ANNASHUWA VTU account has been activated."
          : "Your ANNASHUWA VTU account has been suspended. Contact support.",
        type: status === "ACTIVE" ? "SUCCESS" : "ERROR",
      });
      await createAuditLog({
        userId: req.auth!.userId,
        action: "ADMIN_SET_USER_STATUS",
        entityType: "User",
        entityId: userId,
        details: { status },
        req,
      });
      res.json({ status });
      return;
    }

    if (body.walletAdjust) {
      const parsed = adminWalletSchema.safeParse(body.walletAdjust);
      if (!parsed.success) throw new ApiError(400, "Invalid wallet adjustment", "VALIDATION_ERROR");
      const { amount, type, reason } = parsed.data;
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) throw new ApiError(404, "Wallet not found", "NOT_FOUND");
      const delta = type === "CREDIT" ? round2(amount) : -round2(amount);
      // Atomic $inc on both balance and availableBalance preserves the
      // invariant balance = available + pending. Debits are guarded so neither
      // balance nor available can go negative.
      const guard =
        delta < 0
          ? { _id: wallet._id, balance: { $gte: -delta }, availableBalance: { $gte: -delta } }
          : { _id: wallet._id };
      const updated = await Wallet.findOneAndUpdate(
        guard,
        { $inc: { balance: delta, availableBalance: delta } },
        { new: true }
      );
      if (!updated) throw new ApiError(400, "Adjustment would make balance negative");
      const newBalance = round2(Number(updated.balance ?? 0));
      await WalletTransaction.create({
        walletId: wallet._id,
        userId,
        type: "ADJUSTMENT",
        amount: delta,
        balanceAfter: newBalance,
        status: "SUCCESSFUL",
        reference: generateReference("ADJ"),
        description: `Admin ${type === "CREDIT" ? "credit" : "debit"} (${reason})`,
      });
      await createAuditLog({
        userId: req.auth!.userId,
        action: type === "CREDIT" ? "ADMIN_WALLET_CREDIT" : "ADMIN_WALLET_DEBIT",
        entityType: "User",
        entityId: userId,
        details: { amount, reason },
        req,
      });
      await createNotification({
        userId,
        title: "Wallet updated",
        message: `Your wallet was ${type === "CREDIT" ? "credited" : "debited"} with ₦${amount}. ${reason}`,
        type: "INFO",
      });
      res.json({ newBalance });
      return;
    }

    res.status(400).json({ error: "No valid operation provided" });
  })
);

router.patch(
  "/users/:id/kyc",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { kycStatus?: string; note?: string };
    if (body.kycStatus !== "VERIFIED" && body.kycStatus !== "REJECTED") {
      throw new ApiError(400, "Invalid KYC decision", "VALIDATION_ERROR");
    }
    const result = await decideKyc(req.params.id, body.kycStatus, req.auth!.userId, body.note, req);
    if (!result) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(result);
  })
);

// ---------- Transactions ----------

router.get(
  "/transactions",
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseQueryInt(req.query?.page, 1);
    const pageSize = parseQueryInt(req.query?.pageSize, 20, 5, 100);
    const result = await listAllTransactions({
      search: typeof req.query?.search === "string" ? req.query.search : undefined,
      serviceType: typeof req.query?.serviceType === "string" ? req.query.serviceType : undefined,
      status: typeof req.query?.status === "string" ? req.query.status : undefined,
      from: typeof req.query?.from === "string" ? req.query.from : undefined,
      to: typeof req.query?.to === "string" ? req.query.to : undefined,
      page,
      pageSize,
    });
    const userIds = result.items.map((t) => String(t.userId));
    const users = await User.find({ _id: { $in: userIds } }).select("fullName email");
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    res.json({
      items: result.items.map((t) => ({
        id: t._id,
        reference: t.reference,
        serviceType: t.serviceType,
        provider: t.provider,
        customerInfo: t.customerInfo ?? null,
        amount: moneyToString(t.amount) ?? "0",
        fee: moneyToString(t.fee) ?? "0",
        status: t.status,
        description: t.description ?? null,
        paymentMethod: t.paymentMethod ?? null,
        user: userMap.get(String(t.userId))?.fullName ?? "Deleted user",
        userEmail: userMap.get(String(t.userId))?.email ?? null,
        userId: String(t.userId),
        createdAt: new Date(t.createdAt).toISOString(),
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  })
);

// ---------- Services / Providers ----------

router.get(
  "/services",
  asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    if (typeof req.query?.category === "string") filter.category = req.query.category;
    const providers = await ServiceProvider.find(filter).sort({ category: 1, name: 1 });
    const packages = await ServicePackage.find().sort({ price: 1 });
    const packagesByProvider = new Map<string, typeof packages>();
    for (const pkg of packages) {
      const list = packagesByProvider.get(pkg.providerId) ?? [];
      list.push(pkg);
      packagesByProvider.set(pkg.providerId, list);
    }
    res.json({
      providers: providers.map((p) => ({
        ...providerJSON(p),
        packages: (packagesByProvider.get(String(p._id)) ?? []).map((pkg) => ({
          id: pkg._id,
          name: pkg.name,
          price: moneyToString(pkg.price) ?? "0",
          oldPrice: moneyToString(pkg.oldPrice ?? null),
          duration: pkg.duration ?? null,
          isActive: pkg.isActive,
        })),
      })),
    });
  })
);

router.post(
  "/services/providers",
  validate(adminServiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof adminServiceSchema>;
    const provider = await ServiceProvider.create({
      category: body.category,
      name: body.name,
      code: body.code,
      description: body.description ?? null,
      fee: body.fee ?? 0,
      isActive: body.isActive ?? true,
    });
    res.status(201).json({ provider: providerJSON(provider) });
  })
);

router.get(
  "/services/providers/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    const packages = await ServicePackage.find({ providerId: provider._id }).sort({ price: 1 });
    res.json({
      provider: {
        ...providerJSON(provider),
        packages: packages.map((pkg) => ({
          id: pkg._id,
          name: pkg.name,
          price: moneyToString(pkg.price) ?? "0",
          oldPrice: moneyToString(pkg.oldPrice ?? null),
          duration: pkg.duration ?? null,
          isActive: pkg.isActive,
        })),
      },
    });
  })
);

router.patch(
  "/services/providers/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const set: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") set.isActive = body.isActive;
    if (typeof body.name === "string") set.name = body.name;
    if (typeof body.description === "string") set.description = body.description;
    if (typeof body.fee === "number") set.fee = body.fee;
    const updated = await ServiceProvider.findByIdAndUpdate(provider._id, { $set: set }, { new: true });
    res.json({ provider: providerJSON(updated!) });
  })
);

router.delete(
  "/services/providers/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    await ServicePackage.deleteMany({ providerId: provider._id });
    await ServiceProvider.findByIdAndDelete(provider._id);
    res.json({ ok: true });
  })
);

// ---------- Data plans ----------

router.get(
  "/services/data-plans",
  asyncHandler(async (_req: Request, res: Response) => {
    const plans = await DataPlan.find().sort({ network: 1, price: 1 });
    res.json({ plans: plans.map((p) => planJSON(p)) });
  })
);

router.post(
  "/services/data-plans",
  validate(adminDataPlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof adminDataPlanSchema>;
    const plan = await DataPlan.create({
      network: body.network,
      planName: body.planName,
      size: body.size,
      validity: body.validity,
      price: body.price,
      oldPrice: body.oldPrice ?? null,
      kind: body.kind ?? "DATA",
      isActive: body.isActive ?? true,
    });
    res.status(201).json({ plan: planJSON(plan) });
  })
);

router.patch(
  "/services/data-plans/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const plan = await DataPlan.findById(req.params.id);
    if (!plan) {
      res.status(404).json({ error: "Data plan not found" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const set: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") set.isActive = body.isActive;
    if (typeof body.network === "string") set.network = body.network;
    if (typeof body.planName === "string") set.planName = body.planName;
    if (typeof body.size === "string") set.size = body.size;
    if (typeof body.validity === "string") set.validity = body.validity;
    if (typeof body.price === "number") set.price = body.price;
    if (typeof body.oldPrice === "number") set.oldPrice = body.oldPrice;
    if (typeof body.kind === "string") set.kind = body.kind;
    const updated = await DataPlan.findByIdAndUpdate(plan._id, { $set: set }, { new: true });
    res.json({ plan: planJSON(updated!) });
  })
);

router.delete(
  "/services/data-plans/:id",
  asyncHandler(async (req: Request, res: Response) => {
    await DataPlan.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  })
);

// ---------- Exam PIN products ----------

router.get(
  "/services/exam-pins",
  asyncHandler(async (_req: Request, res: Response) => {
    const products = await ExamPinProduct.find().sort({ category: 1 });
    res.json({ products: products.map((p) => examProductJSON(p)) });
  })
);

router.post(
  "/services/exam-pins",
  validate(adminExamPinSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof adminExamPinSchema>;
    const product = await ExamPinProduct.create({
      name: body.name,
      category: body.category,
      price: body.price,
      costPrice: body.costPrice ?? null,
      description: body.description ?? null,
      isActive: body.isActive ?? true,
    });
    res.status(201).json({ product: examProductJSON(product) });
  })
);

router.patch(
  "/services/exam-pins",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    if (typeof body.id !== "string") throw new ApiError(400, "product id is required", "VALIDATION_ERROR");
    const product = await ExamPinProduct.findById(body.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const set: Record<string, unknown> = {};
    if (typeof body.name === "string") set.name = body.name;
    if (typeof body.category === "string") set.category = body.category;
    if (typeof body.price === "number") set.price = body.price;
    if (typeof body.costPrice === "number") set.costPrice = body.costPrice;
    if (typeof body.description === "string") set.description = body.description;
    if (typeof body.isActive === "boolean") set.isActive = body.isActive;
    const updated = await ExamPinProduct.findByIdAndUpdate(product._id, { $set: set }, { new: true });
    res.json({ product: examProductJSON(updated!) });
  })
);

router.delete(
  "/services/exam-pins",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { id?: string };
    if (typeof body.id !== "string") throw new ApiError(400, "product id is required", "VALIDATION_ERROR");
    await ExamPinProduct.findByIdAndDelete(body.id);
    res.json({ ok: true });
  })
);

// ---------- Packages ----------

router.post(
  "/services/packages",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    if (typeof body.providerId !== "string" || typeof body.name !== "string" || typeof body.price !== "number") {
      throw new ApiError(400, "providerId, name and price are required", "VALIDATION_ERROR");
    }
    const pkg = await ServicePackage.create({
      providerId: body.providerId,
      name: body.name,
      price: body.price,
      oldPrice: typeof body.oldPrice === "number" ? body.oldPrice : null,
      duration: typeof body.duration === "string" ? body.duration : null,
      description: typeof body.description === "string" ? body.description : null,
      isActive: true,
    });
    res.status(201).json({
      pkg: {
        id: pkg._id,
        providerId: pkg.providerId,
        name: pkg.name,
        price: moneyToString(pkg.price) ?? "0",
        oldPrice: moneyToString(pkg.oldPrice ?? null),
        duration: pkg.duration ?? null,
        isActive: pkg.isActive,
      },
    });
  })
);

router.patch(
  "/services/packages",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    if (typeof body.id !== "string") throw new ApiError(400, "package id is required", "VALIDATION_ERROR");
    const pkg = await ServicePackage.findById(body.id);
    if (!pkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }
    const set: Record<string, unknown> = {};
    if (typeof body.name === "string") set.name = body.name;
    if (typeof body.price === "number") set.price = body.price;
    if (typeof body.oldPrice === "number") set.oldPrice = body.oldPrice;
    if (typeof body.duration === "string") set.duration = body.duration;
    if (typeof body.isActive === "boolean") set.isActive = body.isActive;
    const updated = await ServicePackage.findByIdAndUpdate(pkg._id, { $set: set }, { new: true });
    res.json({
      pkg: {
        id: updated!._id,
        providerId: updated!.providerId,
        name: updated!.name,
        price: moneyToString(updated!.price) ?? "0",
        oldPrice: moneyToString(updated!.oldPrice ?? null),
        duration: updated!.duration ?? null,
        isActive: updated!.isActive,
      },
    });
  })
);

router.delete(
  "/services/packages",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { id?: string };
    if (typeof body.id !== "string") throw new ApiError(400, "package id is required", "VALIDATION_ERROR");
    await ServicePackage.findByIdAndDelete(body.id);
    res.json({ ok: true });
  })
);

// ---------- Airtime-to-cash admin ----------

// NOTE: register "/airtime-cash/config" and "/airtime-cash/:id/approve|reject"
// BEFORE "/airtime-cash/:id" so param matching does not shadow them.

function airtimeCashJSON(r: Record<string, any>, extra?: { userName?: string | null; userEmail?: string | null; verifiedByName?: string | null }) {
  return serializeAirtimeCash(
    {
      id: r._id,
      reference: r.reference,
      network: r.network,
      phone: r.phone,
      receivingPhone: r.receivingPhone,
      amount: r.amount,
      conversionRate: r.conversionRate,
      grossCashAmount: r.grossCashAmount,
      fee: r.fee,
      netAmount: r.netAmount,
      status: r.status,
      verificationNotes: r.verificationNotes,
      verifiedBy: r.verifiedBy,
      verifiedAt: r.verifiedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    },
    extra
  );
}

router.get(
  "/airtime-cash/config",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ networks: await getAirtimeCashNetworks() });
  })
);

router.patch(
  "/airtime-cash/config",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { networks?: unknown };
    if (!Array.isArray(body.networks)) {
      throw new ApiError(400, "A `networks` array is required", "VALIDATION_ERROR");
    }
    const current = await getAirtimeCashNetworks();
    const normalized = DEFAULT_NETWORKS.map((network) => {
      const incoming = (body.networks as any[]).find((n) => n && n.network === network);
      if (!incoming) {
        const existing = current.find((c) => c.network === network);
        return existing ?? { network, receivingNumber: null, conversionRate: 80, minAmount: 1000, maxAmount: 50000, fee: 0, enabled: true };
      }
      return {
        network,
        receivingNumber: typeof incoming.receivingNumber === "string" ? incoming.receivingNumber : (current.find((c) => c.network === network)?.receivingNumber ?? null),
        conversionRate: Number(incoming.conversionRate ?? current.find((c) => c.network === network)?.conversionRate ?? 80),
        minAmount: Number(incoming.minAmount ?? current.find((c) => c.network === network)?.minAmount ?? 1000),
        maxAmount: Number(incoming.maxAmount ?? current.find((c) => c.network === network)?.maxAmount ?? 50000),
        fee: Number(incoming.fee ?? current.find((c) => c.network === network)?.fee ?? 0),
        enabled: typeof incoming.enabled === "boolean" ? incoming.enabled : Boolean(current.find((c) => c.network === network)?.enabled ?? true),
      };
    });
    await setSystemConfig("airtimeCashNetworks", normalized);
    await createAuditLog({
      userId: req.auth!.userId,
      action: "ADMIN_SET_AIRTIME_CASH_CONFIG",
      req,
    });
    res.json({ ok: true, networks: normalized });
  })
);

router.get(
  "/airtime-cash",
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseQueryInt(req.query?.page, 1);
    const pageSize = parseQueryInt(req.query?.pageSize, 20, 5, 100);
    const result = await listAllAirtimeCashRequests({
      status: typeof req.query?.status === "string" ? req.query.status : undefined,
      page,
      pageSize,
    });
    const userIds = result.requests.map((r) => String(r.userId));
    const users = await User.find({ _id: { $in: userIds } }).select("fullName email phone");
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const verifiedIds = result.requests.map((r) => (r.verifiedBy ? String(r.verifiedBy) : null)).filter(Boolean) as string[];
    const verifiedUsers = await User.find({ _id: { $in: verifiedIds } }).select("fullName");
    const verifiedMap = new Map(verifiedUsers.map((u) => [String(u._id), u.fullName]));
    res.json({
      requests: result.requests.map((r) =>
        airtimeCashJSON(r, {
          userName: userMap.get(String(r.userId))?.fullName ?? "Deleted user",
          userEmail: userMap.get(String(r.userId))?.email ?? null,
          verifiedByName: r.verifiedBy ? verifiedMap.get(String(r.verifiedBy)) ?? null : null,
        })
      ),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  })
);

router.get(
  "/airtime-cash/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { AirtimeCashRequest } = await import("../models");
    const request = await AirtimeCashRequest.findById(req.params.id).lean();
    if (!request) throw new ApiError(404, "Request not found", "NOT_FOUND");
    const [requester, verifier] = await Promise.all([
      User.findById(request.userId).select("fullName email phone").lean(),
      request.verifiedBy ? User.findById(request.verifiedBy).select("fullName").lean() : null,
    ]);
    res.json({
      request: airtimeCashJSON(request, {
        userName: requester?.fullName ?? "Deleted user",
        userEmail: requester?.email ?? null,
        verifiedByName: verifier?.fullName ?? null,
      }),
    });
  })
);

router.post(
  "/airtime-cash/:id/approve",
  asyncHandler(async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { note?: string };
    const result = await approveAirtimeCashRequest(req.params.id, req.auth!.userId, body.note, req);
    if (!result) throw new ApiError(404, "Request not found", "NOT_FOUND");
    res.json(result);
  })
);

router.post(
  "/airtime-cash/:id/reject",
  asyncHandler(async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { note?: string };
    const result = await rejectAirtimeCashRequest(req.params.id, req.auth!.userId, body.note, req);
    if (!result) throw new ApiError(404, "Request not found", "NOT_FOUND");
    res.json(result);
  })
);

router.post(
  "/airtime-cash/:id/begin-verify",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await beginAirtimeCashVerification(req.params.id, req.auth!.userId, req);
    if (!result) throw new ApiError(404, "Request not found", "NOT_FOUND");
    res.json(result);
  })
);

router.patch(
  "/airtime-cash/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { status?: string; note?: string };
    if (body.status !== "APPROVED" && body.status !== "REJECTED") {
      throw new ApiError(400, "Invalid status", "VALIDATION_ERROR");
    }
    const result = await decideAirtimeCashRequest(req.params.id, body.status, req.auth!.userId, body.note, req);
    if (!result) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json(result);
  })
);

// ---------- System config / settings ----------

router.get(
  "/settings",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ config: await getAllSystemConfig() });
  })
);

router.patch(
  "/settings",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { key?: string; value?: unknown };
    if (typeof body.key !== "string" || body.key.length < 2) {
      throw new ApiError(400, "A valid config key is required", "VALIDATION_ERROR");
    }
    await setSystemConfig(body.key, body.value);
    await createAuditLog({
      userId: req.auth!.userId,
      action: "ADMIN_SET_SYSTEM_CONFIG",
      details: { key: body.key },
      req,
    });
    res.json({ ok: true, key: body.key, value: body.value });
  })
);

router.get(
  "/vtu/providers",
  asyncHandler(async (_req: Request, res: Response) => {
    const mgr = getProviderManager();
    const readiness = await mgr.readiness();
    res.json({ providers: readiness, active: mgr.getActiveId() });
  })
);

router.get(
  "/vtu/active",
  asyncHandler(async (_req: Request, res: Response) => {
    const mgr = getProviderManager();
    res.json({ active: mgr.getActiveId() });
  })
);

router.post(
  "/vtu/active",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { providerId?: string };
    const mgr = getProviderManager();
    if (!body.providerId) {
      throw new ApiError(400, "providerId is required", "VALIDATION_ERROR");
    }
    const ok = await mgr.setActive(body.providerId);
    if (!ok) {
      throw new ApiError(400, `Unknown provider "${body.providerId}"`, "VALIDATION_ERROR");
    }
    await createAuditLog({
      userId: req.auth!.userId,
      action: "ADMIN_SET_ACTIVE_PROVIDER",
      details: { providerId: body.providerId },
      req,
    });
    res.json({ ok: true, active: mgr.getActiveId() });
  })
);

router.get(
  "/vtu/route",
  asyncHandler(async (req: Request, res: Response) => {
    const service = String(req.query.service ?? "AIRTIME").toUpperCase() as "AIRTIME" | "DATA" | "ELECTRICITY" | "CABLE" | "EXAM_PIN";
    const amount = Number(req.query.amount ?? NaN);
    const preferred = typeof req.query.preferred === "string" ? req.query.preferred : undefined;
    const excludeRaw = Array.isArray(req.query.exclude) ? req.query.exclude : req.query.exclude ? [req.query.exclude] : [];
    const exclude = excludeRaw.map((x) => String(x)) as string[];
    const decision = routeProviders({
      serviceType: service,
      amount: Number.isFinite(amount) ? amount : undefined,
      preferredProvider: preferred,
      ...(exclude.length ? { exclude: exclude as never } : {}),
    });
    res.json(decision);
  })
);

router.get(
  "/jobs",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ reconciliation: getReconciliationStatus() });
  })
);

router.post(
  "/jobs/reconcile",
  asyncHandler(async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const summary = await reconcilePendingTransactions();
    await createAuditLog({
      userId: req.auth!.userId,
      action: "ADMIN_RUN_RECONCILE",
      details: { summary, tookMs: Date.now() - startedAt },
      req,
    });
    res.json({ ok: true, tookMs: Date.now() - startedAt, summary });
  })
);

export default router;