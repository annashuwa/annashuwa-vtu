import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export type AirtimeCashStatus =
  | "PENDING"
  | "VERIFYING"
  | "APPROVED"
  | "REJECTED"
  | "FAILED"
  | "CANCELLED";

export interface IAirtimeCashRequest {
  _id: string;
  userId: string;
  network: string;
  /** The user's number that sent the airtime. */
  phone: string;
  /** Platform receiving number the airtime was transferred to. */
  receivingPhone: string;
  /** Airtime amount sent. */
  amount: number;
  /** Per-network conversion rate (percent, e.g. 80). */
  conversionRate: number;
  /** amount * conversionRate / 100 (before fee). */
  grossCashAmount: number;
  fee: number;
  /** grossCashAmount - fee — the actual wallet credit on approval. */
  netAmount: number;
  status: AirtimeCashStatus;
  reference: string;
  verificationNotes: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const airtimeCashSchema = new Schema<IAirtimeCashRequest>(
  {
    _id: { type: String, default: () => genId() },
    userId: { type: String, required: true, index: true },
    network: { type: String, required: true },
    phone: { type: String, required: true },
    receivingPhone: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    conversionRate: { type: Number, default: 0 },
    grossCashAmount: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    status: { type: String, default: "PENDING", index: true, enum: ["PENDING", "VERIFYING", "APPROVED", "REJECTED", "FAILED", "CANCELLED"] },
    reference: { type: String, required: true, unique: true },
    verificationNotes: { type: String, default: null },
    verifiedBy: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

airtimeCashSchema.index({ userId: 1, createdAt: -1 });
airtimeCashSchema.index({ status: 1, createdAt: -1 });

export const AirtimeCashRequest =
  (models.AirtimeCashRequest as Model<IAirtimeCashRequest> | undefined) ??
  model<IAirtimeCashRequest>("AirtimeCashRequest", airtimeCashSchema);
