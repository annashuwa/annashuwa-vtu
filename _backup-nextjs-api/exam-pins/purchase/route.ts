import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { examPinSchema } from "@/lib/validators";
import { executePurchase } from "@/services/purchase.service";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import type { ExamPinResponse } from "@/services/vtu/types";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(getClientId(req, "exam-pins-purchase"), 5, 60)) {
      throw new ApiError(429, "Too many requests. Please wait a moment.");
    }
    const body = await req.json();
    const parsed = examPinSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
    }
    const { productId, phone, quantity } = parsed.data;
    const product = await prisma.examPinProduct.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      throw new ApiError(404, "Exam PIN product not found or unavailable.", "PRODUCT_NOT_FOUND");
    }

    const unitPrice = Number(product.price);
    const total = unitPrice * quantity;

    const result = await executePurchase({
      userId: user.id,
      serviceType: "EXAM_PIN",
      provider: product.name,
      customerInfo: phone,
      amount: total,
      description: `${quantity} x ${product.name} (₦${unitPrice})${phone ? ` to ${phone}` : ""}`,
      metadata: { product: product.name, category: product.category, quantity, phone },
      execute: (vtu) => vtu.purchaseExamPin({ category: product.category, quantity }),
    });

    await prisma.examPinProduct.update({
      where: { id: product.id },
      data: { soldCount: { increment: quantity } },
    });

    const providerResponse = result.providerResponse as unknown as ExamPinResponse | null;

    return NextResponse.json({
      transaction: result.transaction,
      pins: providerResponse?.pins ?? [],
      serials: providerResponse?.serials ?? [],
      providerResponse,
    });
  } catch (err) {
    return jsonError(err);
  }
}