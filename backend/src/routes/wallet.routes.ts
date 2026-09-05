import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../lib/errors";
import { rateLimit } from "../lib/rate-limit";
import { validate } from "../middleware/validate";
import { requireUser } from "../middleware/auth";
import { fundWalletSchema } from "../lib/validators";
import { getWalletSummary } from "../services/wallet.service";
import { initializeFunding, finalizeWalletFunding } from "../services/wallet-funding.service";
import { serializeWallet, serializeWalletTxn } from "../lib/serialize";

const router = Router();

router.use(requireUser);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const { wallet, transactions } = await getWalletSummary(userId);
    res.json({
      wallet: serializeWallet({ id: String(wallet._id), balance: wallet.balance, availableBalance: wallet.availableBalance, pendingBalance: wallet.pendingBalance, currency: wallet.currency, updatedAt: wallet.updatedAt }),
      transactions: transactions.map((t) =>
        serializeWalletTxn({ id: String(t._id), type: t.type, amount: t.amount, balanceAfter: t.balanceAfter, status: t.status, reference: t.reference, description: t.description, createdAt: t.createdAt })
      ),
    });
  })
);

router.post(
  "/fund",
  rateLimit("wallet-fund"),
  validate(fundWalletSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { amount: number; gateway: string };
    const init = await initializeFunding({
      userId: req.auth!.userId,
      email: req.authUser!.email,
      amount: body.amount,
      gateway: body.gateway ?? "TEST",
      fullName: req.authUser!.fullName,
      req,
    });
    const out: Record<string, string> = { reference: init.reference, gateway: init.gateway };
    if (init.authUrl) out.authUrl = init.authUrl;
    if (init.message) out.message = init.message;
    res.json(out);
  })
);

router.post(
  "/fund/confirm",
  asyncHandler(async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { reference?: string; simulate?: "success" | "decline" };
    const result = await finalizeWalletFunding(body.reference ?? "", {
      simulate: body.simulate,
      userId: req.auth!.userId,
      role: req.auth!.role,
      req,
    });
    if ((result as { alreadyFinalized?: boolean }).alreadyFinalized) {
      const r = result as { payment: { status: string }; balance: number };
      res.json({ status: r.payment.status, balance: r.balance, reference: body.reference });
      return;
    }
    const r = result as { status: string; balance: number; reference: string };
    res.json({ status: r.status, balance: r.balance, reference: r.reference });
  })
);

export default router;