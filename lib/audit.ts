import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
}) {
  if (!process.env.APP_ENV || process.env.APP_ENV === "production") {
    // keep audit only in non-production or when explicitly enabled
  }
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details ? JSON.stringify(input.details) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}