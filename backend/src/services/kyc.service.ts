import { User } from "../models";
import { createNotification } from "./notification.service";
import { createAuditLog } from "../lib/audit";
import type { Request } from "express";

export type KycStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export async function getKycStatus(userId: string) {
  const user = await User.findById(userId).select("kycStatus kycFields").lean();
  if (!user) return null;
  return {
    kycStatus: user.kycStatus,
    kycFields: user.kycFields ?? null,
  };
}

export async function submitKyc(
  userId: string,
  input: { idType: string; idNumber: string; documentUrl?: string },
  req?: Request
) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.kycStatus === "PENDING") {
    return { kycStatus: "PENDING", message: "Your KYC verification is still being reviewed." };
  }
  await User.findByIdAndUpdate(userId, {
    $set: {
      kycStatus: "PENDING",
      kycFields: {
        idType: input.idType,
        idNumber: input.idNumber,
        documentUrl: input.documentUrl ?? null,
        submittedAt: new Date(),
      },
    },
  });
  await createNotification({
    userId,
    title: "KYC submitted",
    message: "Your KYC document has been submitted for review.",
    type: "INFO",
  });
  await createAuditLog({
    userId,
    action: "KYC_SUBMIT",
    entityType: "User",
    entityId: userId,
    details: { idType: input.idType },
    req,
  });
  return { kycStatus: "PENDING", message: "Your KYC document has been submitted for review." };
}

export async function decideKyc(
  userId: string,
  decision: "VERIFIED" | "REJECTED",
  adminUserId: string,
  note?: string,
  req?: Request
) {
  const user = await User.findById(userId);
  if (!user) return null;
  await User.findByIdAndUpdate(userId, {
    $set: {
      kycStatus: decision,
      ...(note ? { "kycFields.reviewNote": note } : {}),
      "kycFields.reviewedAt": new Date(),
    },
  });
  if (decision === "VERIFIED") {
    await createNotification({
      userId,
      title: "KYC approved",
      message: "Your identity has been verified. You can now make purchases above the limit.",
      type: "SUCCESS",
    });
  } else {
    await createNotification({
      userId,
      title: "KYC rejected",
      message: note ?? "Your KYC submission was not approved. Please contact support.",
      type: "ERROR",
    });
  }
  await createAuditLog({
    userId: adminUserId,
    action: "ADMIN_KYC_DECIDE",
    entityType: "User",
    entityId: userId,
    details: { decision, note },
    req,
  });
  return { kycStatus: decision };
}