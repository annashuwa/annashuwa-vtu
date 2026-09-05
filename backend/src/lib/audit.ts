import type { Request } from "express";
import { AuditLog } from "../models";

export async function createAuditLog(input: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
  req?: Request;
}) {
  if (process.env.APP_ENV === "production" && !process.env.ENABLE_AUDIT) return;
  try {
    const ip =
      input.req?.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
      input.req?.socket.remoteAddress ||
      null;
    await AuditLog.create({
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      details: input.details ? JSON.stringify(input.details) : null,
      ip,
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}