import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IAuditLog {
  _id: string;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: string | null;
  ip?: string | null;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    _id: { type: String, default: () => genId() },
    userId: { type: String, default: null, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: null },
    entityId: { type: String, default: null },
    details: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog =
  (models.AuditLog as Model<IAuditLog> | undefined) ?? model<IAuditLog>("AuditLog", auditLogSchema);