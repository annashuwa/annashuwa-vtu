import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { fundWalletSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/utils";
import { getPaymentProvider } from "@/services/payment";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { createTransaction } from "@/services/transaction.service";
import { createNotification } from "@/services/notification.service";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(getClientId(req, "wallet-fund"), 5, 60)) {
      throw new ApiError(429, "Too many requests. Please wait a moment.");
    }
    const body = await req.json();
    const parsed = fundWalletSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid funding amount", "VALIDATION_ERROR");
    }
    const { amount, gateway } = parsed.data;

    const reference = generateReference("ANS-FUND");
    const txn = await createTransaction({
      userId: user.id,
      serviceType: "WALLET_FUNDING",
      provider: gateway,
      customerInfo: user.email,
      amount,
      description: `Wallet top-up of ₦${amount}`,
      status: "PENDING",
      paymentMethod: gateway,
      reference,
      metadata: { gateway },
    });

    const payment = await prisma.payment.create({
      data: {
        reference,
        userId: user.id,
        transactionId: txn.id,
        amount,
        gateway,
        status: "PENDING",
        metadata: JSON.stringify({ email: user.email, fullName: user.fullName }),
      },
    });

    const provider = getPaymentProvider(gateway);
    const init = await provider.initialize({
      userId: user.id,
      email: user.email,
      amount,
      reference,
      metadata: { fullName: user.fullName, transactionId: txn.id },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { initData: JSON.stringify(init) },
    });

    await createNotification({
      userId: user.id,
      title: "Payment initiated",
      message: `A wallet funding of ₦${amount} has been initiated (${init.gateway}).`,
      type: "INFO",
    });

    return NextResponse.json({
      reference,
      gateway: init.gateway,
      authUrl: init.authUrl,
      message: init.message,
    });
  } catch (err) {
    return jsonError(err);
  }
}