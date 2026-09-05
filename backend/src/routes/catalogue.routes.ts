import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../lib/errors";
import { DataPlan, ExamPinProduct, ServiceProvider, ServicePackage } from "../models";
import { moneyToString } from "../lib/utils";

const router = Router();
const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

router.get(
  "/data/plans",
  asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = { isActive: true };
    if (typeof req.query?.network === "string") filter.network = req.query.network;
    const plans = await DataPlan.find(filter).sort({ network: 1, price: 1 });
    res.json({
      plans: plans.map((p) => ({
        id: p._id,
        network: p.network,
        planName: p.planName,
        size: p.size,
        validity: p.validity,
        price: moneyToString(p.price) ?? "0",
        oldPrice: moneyToString(p.oldPrice ?? null),
        kind: p.kind,
      })),
      networks: NETWORKS,
    });
  })
);

router.get(
  "/electricity/providers",
  asyncHandler(async (_req: Request, res: Response) => {
    const providers = await ServiceProvider.find({
      category: "ELECTRICITY",
      isActive: true,
    }).sort({ name: 1 });
    res.json({
      providers: providers.map((p) => ({
        id: p._id,
        name: p.name,
        code: p.code,
        description: p.description ?? null,
        fee: moneyToString(p.fee) ?? "0",
      })),
    });
  })
);

router.get(
  "/cable/providers",
  asyncHandler(async (_req: Request, res: Response) => {
    const providers = await ServiceProvider.find({
      category: "CABLE",
      isActive: true,
    }).sort({ name: 1 });
    const packages = await ServicePackage.find({ isActive: true }).sort({ price: 1 });
    const packagesByProvider = new Map<string, typeof packages>();
    for (const pkg of packages) {
      const list = packagesByProvider.get(pkg.providerId) ?? [];
      list.push(pkg);
      packagesByProvider.set(pkg.providerId, list);
    }
    res.json({
      providers: providers.map((p) => ({
        id: p._id,
        name: p.name,
        code: p.code,
        description: p.description ?? null,
        packages: (packagesByProvider.get(String(p._id)) ?? []).map((pkg) => ({
          id: pkg._id,
          name: pkg.name,
          price: moneyToString(pkg.price) ?? "0",
          oldPrice: moneyToString(pkg.oldPrice ?? null),
          duration: pkg.duration ?? null,
        })),
      })),
    });
  })
);

router.get(
  "/exam-pins",
  asyncHandler(async (_req: Request, res: Response) => {
    const products = await ExamPinProduct.find({ isActive: true }).sort({ category: 1 });
    res.json({
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        category: p.category,
        price: moneyToString(p.price) ?? "0",
        costPrice: moneyToString(p.costPrice ?? null),
        description: p.description ?? null,
        soldCount: p.soldCount,
      })),
    });
  })
);

export default router;