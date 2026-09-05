import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/auth";
import { finalizeWalletFunding } from "@/services/wallet-funding.service";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const reference = String(body?.reference ?? "");
    const simulate = body?.simulate;

    const result = await finalizeWalletFunding(reference, {
      simulate: simulate === "success" ? "SUCCESSFUL" : simulate === "decline" ? "FAILED" : undefined,
    });

    const isOwner =
      result.payment.userId === user.id ||
      user.role === "ADMIN";
    if (!isOwner) {
      return NextResponse.json({ error: "Not authorized", code: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({
      status: result.payment.status,
      balance: result.balance,
      reference,
    });
  } catch (err) {
    return jsonError(err);
  }
}