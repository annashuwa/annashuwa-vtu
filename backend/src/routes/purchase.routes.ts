import { Router, type Request, type Response } from "express";
import { ApiError, asyncHandler } from "../lib/errors";
import { rateLimit } from "../lib/rate-limit";
import { validate } from "../middleware/validate";
import { requireUser } from "../middleware/auth";
import {
  airtimeSchema,
  dataSchema,
  electricitySchema,
  electricityValidateSchema,
  cableSchema,
  cableValidateSchema,
  examPinSchema,
} from "../lib/validators";
import { executePurchase } from "../services/purchase.service";
import { getVtuProvider } from "../services/vtu";
import { DataPlan, ExamPinProduct, ServiceProvider, ServicePackage } from "../models";

const router = Router();
const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

router.post(
  "/airtime",
  requireUser,
  rateLimit("airtime"),
  validate(airtimeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { network: string; phone: string; amount: number };
    if (!NETWORKS.includes(body.network)) {
      throw new ApiError(400, "Unknown network provider", "VALIDATION_ERROR");
    }
    const result = await executePurchase({
      userId: req.auth!.userId,
      serviceType: "AIRTIME",
      provider: body.network,
      customerInfo: body.phone,
      amount: body.amount,
      description: `${body.network} airtime of ₦${body.amount} to ${body.phone}`,
      metadata: { network: body.network, phone: body.phone },
      execute: (vtu) => vtu.buyAirtime({ network: body.network, phone: body.phone, amount: body.amount }),
    });
    res.json(result);
  })
);

router.post(
  "/data",
  requireUser,
  rateLimit("data"),
  validate(dataSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { network: string; phone: string; planId: string };
    const plan = await DataPlan.findOne({ _id: body.planId, isActive: true });
    if (!plan) {
      throw new ApiError(404, "Data plan not found or unavailable.", "PLAN_NOT_FOUND");
    }
    if (plan.network !== body.network) {
      throw new ApiError(400, "Plan does not belong to the selected network.", "PLAN_MISMATCH");
    }
    const planPrice = Number(plan.price);
    const result = await executePurchase({
      userId: req.auth!.userId,
      serviceType: "DATA",
      provider: body.network,
      customerInfo: body.phone,
      amount: planPrice,
      description: `${plan.planName} (${plan.size} - ${plan.validity}) to ${body.phone}`,
      metadata: { network: body.network, phone: body.phone, planId: plan._id, planName: plan.planName, size: plan.size },
      execute: (vtu) =>
        vtu.buyData({ network: body.network, phone: body.phone, planName: plan.planName, size: plan.size, amount: planPrice }),
    });
    res.json(result);
  })
);

router.post(
  "/electricity",
  requireUser,
  rateLimit("electricity"),
  validate(electricitySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { provider: string; meterNumber: string; meterType: "prepaid" | "postpaid"; amount: number };
    const provider = await ServiceProvider.findOne({ code: body.provider, category: "ELECTRICITY", isActive: true });
    if (!provider) {
      throw new ApiError(404, "Electricity provider not found.", "PROVIDER_NOT_FOUND");
    }
    const fee = Number(provider.fee ?? 0) || 100;
    const result = await executePurchase({
      userId: req.auth!.userId,
      serviceType: "ELECTRICITY",
      provider: provider.name,
      customerInfo: body.meterNumber,
      amount: body.amount,
      fee,
      description: `${provider.name} ${body.meterType} payment for meter ${body.meterNumber}`,
      metadata: { provider: provider.code, meterNumber: body.meterNumber, meterType: body.meterType },
      execute: (vtu) =>
        vtu.buyElectricity({ providerCode: provider.code, meterNumber: body.meterNumber, meterType: body.meterType, amount: body.amount }),
    });
    res.json(result);
  })
);

router.post(
  "/electricity/validate",
  requireUser,
  rateLimit("electricity"),
  validate(electricityValidateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { provider: string; meterNumber: string; meterType: string };
    const provider = await ServiceProvider.findOne({ code: body.provider, category: "ELECTRICITY", isActive: true });
    if (!provider) {
      throw new ApiError(404, "Electricity provider not found.", "PROVIDER_NOT_FOUND");
    }
    const lookup = await getVtuProvider().lookupMeter({
      providerCode: provider.code,
      meterNumber: body.meterNumber,
      meterType: body.meterType,
    });
    if (!lookup.success) {
      throw new ApiError(400, lookup.message ?? "Meter validation failed", "VALIDATION_FAILED");
    }
    res.json({ name: lookup.name, address: lookup.address });
  })
);

router.post(
  "/cable",
  requireUser,
  rateLimit("cable"),
  validate(cableSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { provider: string; smartCard: string; packageId: string; phone?: string };
    const provider = await ServiceProvider.findOne({ code: body.provider, category: "CABLE", isActive: true });
    if (!provider) {
      throw new ApiError(404, "Cable provider not found.", "PROVIDER_NOT_FOUND");
    }
    const packageDoc = await ServicePackage.findOne({ _id: body.packageId, providerId: provider._id, isActive: true });
    if (!packageDoc) {
      throw new ApiError(404, "Package not found or unavailable.", "PACKAGE_NOT_FOUND");
    }
    const fee = Number(provider.fee ?? 0);
    const pkgPrice = Number(packageDoc.price);
    const result = await executePurchase({
      userId: req.auth!.userId,
      serviceType: "CABLE",
      provider: provider.name,
      customerInfo: body.smartCard,
      amount: pkgPrice,
      fee,
      description: `${provider.name} ${packageDoc.name} subscription for smart card ${body.smartCard}`,
      metadata: { provider: provider.code, smartCard: body.smartCard, package: packageDoc.name, phone: body.phone },
      execute: (vtu) =>
        vtu.subscribeCable({ providerCode: provider.code, smartCard: body.smartCard, packageName: packageDoc.name, amount: pkgPrice }),
    });
    res.json(result);
  })
);

router.post(
  "/cable/validate",
  requireUser,
  rateLimit("cable"),
  validate(cableValidateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { provider: string; smartCard: string };
    const provider = await ServiceProvider.findOne({ code: body.provider, category: "CABLE", isActive: true });
    if (!provider) {
      throw new ApiError(404, "Cable provider not found.", "PROVIDER_NOT_FOUND");
    }
    const lookup = await getVtuProvider().lookupSmartCard({ providerCode: provider.code, smartCard: body.smartCard });
    if (!lookup.success) {
      throw new ApiError(400, lookup.message ?? "Smart card validation failed", "VALIDATION_FAILED");
    }
    res.json({ name: lookup.name });
  })
);

router.post(
  "/exam-pins/purchase",
  requireUser,
  rateLimit("exam-pins-purchase"),
  validate(examPinSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { productId: string; phone?: string; quantity: number };
    const product = await ExamPinProduct.findOne({ _id: body.productId, isActive: true });
    if (!product) {
      throw new ApiError(404, "Exam PIN product not found or unavailable.", "PRODUCT_NOT_FOUND");
    }
    const unitPrice = Number(product.price);
    const quantity = body.quantity;
    const total = unitPrice * quantity;
    const result = await executePurchase({
      userId: req.auth!.userId,
      serviceType: "EXAM_PIN",
      provider: product.name,
      customerInfo: body.phone,
      amount: total,
      description: `${quantity} x ${product.name} (₦${unitPrice})${body.phone ? ` to ${body.phone}` : ""}`,
      metadata: { product: product.name, category: product.category, quantity, phone: body.phone },
      execute: (vtu) => vtu.purchaseExamPin({ category: product.category, quantity }),
    });
    await ExamPinProduct.findByIdAndUpdate(product._id, { $inc: { soldCount: quantity } });
    const providerResponse = result.providerResponse as { pins?: string[]; serials?: string[] };
    res.json({
      transaction: result.transaction,
      pins: providerResponse?.pins ?? [],
      serials: providerResponse?.serials ?? [],
      providerResponse,
    });
  })
);

export default router;