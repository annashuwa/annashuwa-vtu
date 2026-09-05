import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ApiError, asyncHandler } from "../lib/errors";
import { rateLimit } from "../lib/rate-limit";
import { validate } from "../middleware/validate";
import { requireUser } from "../middleware/auth";
import {
  createAirtimeToCashRequest,
  listUserAirtimeCashRequests,
  getUserAirtimeCashRequest,
  cancelAirtimeCashRequest,
} from "../services/airtime-cash.service";
import { getAirtimeCashNetworks } from "../services/config.service";
import { serializeAirtimeCash } from "../lib/serialize";

const router = Router();

const a2cSchema = z.object({
  network: z.string().min(2),
  phone: z.string().min(10, "Enter a valid phone number").max(15).regex(/^\+?[\d\s-]+$/, "Enter a valid phone number"),
  amount: z.number().min(50),
});

router.get(
  "/airtime-cash/config",
  requireUser,
  asyncHandler(async (_req: Request, res: Response) => {
    const networks = await getAirtimeCashNetworks();
    res.json({
      networks: networks.map((n) => ({
        network: n.network,
        receivingNumber: n.receivingNumber,
        conversionRate: n.conversionRate,
        minAmount: n.minAmount,
        maxAmount: n.maxAmount,
        fee: n.fee,
        enabled: n.enabled,
      })),
    });
  })
);

router.post(
  "/airtime-cash/request",
  requireUser,
  rateLimit("airtime-to-cash"),
  validate(a2cSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { network: string; phone: string; amount: number };
    const result = await createAirtimeToCashRequest({
      userId: req.auth!.userId,
      network: body.network,
      phone: body.phone,
      amount: body.amount,
      req,
    });
    res.status(201).json(result);
  })
);

// Backward-compatible alias for the original endpoint name.
router.post(
  "/airtime-to-cash",
  requireUser,
  rateLimit("airtime-to-cash"),
  validate(a2cSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { network: string; phone: string; amount: number };
    const result = await createAirtimeToCashRequest({
      userId: req.auth!.userId,
      network: body.network,
      phone: body.phone,
      amount: body.amount,
      req,
    });
    res.status(201).json(result);
  })
);

router.get(
  "/airtime-cash",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const { requests } = await listUserAirtimeCashRequests(req.auth!.userId);
    res.json({
      requests: requests.map((r) => serializeAirtimeCash({ id: r._id, reference: r.reference, network: r.network, phone: r.phone, receivingPhone: r.receivingPhone, amount: r.amount, conversionRate: r.conversionRate, grossCashAmount: r.grossCashAmount, fee: r.fee, netAmount: r.netAmount, status: r.status, verificationNotes: r.verificationNotes, verifiedBy: r.verifiedBy, verifiedAt: r.verifiedAt, createdAt: r.createdAt, updatedAt: r.updatedAt })),
    });
  })
);

router.get(
  "/airtime-cash/:id",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const request = await getUserAirtimeCashRequest(req.auth!.userId, req.params.id);
    if (!request) throw new ApiError(404, "Request not found", "NOT_FOUND");
    res.json({
      request: serializeAirtimeCash({ id: request._id, reference: request.reference, network: request.network, phone: request.phone, receivingPhone: request.receivingPhone, amount: request.amount, conversionRate: request.conversionRate, grossCashAmount: request.grossCashAmount, fee: request.fee, netAmount: request.netAmount, status: request.status, verificationNotes: request.verificationNotes, verifiedBy: request.verifiedBy, verifiedAt: request.verifiedAt, createdAt: request.createdAt, updatedAt: request.updatedAt }),
    });
  })
);

router.post(
  "/airtime-cash/:id/cancel",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await cancelAirtimeCashRequest(req.params.id, req.auth!.userId, req);
    if (!result) throw new ApiError(404, "Request not found", "NOT_FOUND");
    res.json(result);
  })
);

export default router;
