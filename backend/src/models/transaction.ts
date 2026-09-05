import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export const TRANSACTION_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCESSFUL",
  "FAILED",
  "REFUNDED",
  "REVERSED",
  "PARTIAL_REFUND",
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export interface ITransaction {
  _id: string;
  reference: string;
  userId: string;
  serviceType: string;
  provider: string;
  providerId?: string | null;
  providerName?: string | null;
  providerReference?: string | null;
  idempotencyKey?: string | null;
  customerInfo?: string | null;
  amount: number;
  fee: number;
  costPrice?: number | null;
  profit?: number | null;
  refundedAmount?: number | null;
  status: TransactionStatus;
  description?: string | null;
  metadata?: string | null;
  paymentMethod?: string | null;
  channel?: string | null;
  apiResponse?: string | null;
  adminNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    _id: { type: String, default: () => genId() },
    reference: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    serviceType: { type: String, required: true, index: true },
    provider: { type: String, required: true },
    providerId: { type: String, default: null, index: true },
    providerName: { type: String, default: null },
    providerReference: { type: String, default: null, index: true },
    idempotencyKey: { type: String, default: null, index: true },
    customerInfo: { type: String, default: null },
    amount: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    costPrice: { type: Number, default: null },
    profit: { type: Number, default: null },
    refundedAmount: { type: Number, default: null },
    status: { type: String, default: "PENDING", enum: TRANSACTION_STATUSES, index: true },
    description: { type: String, default: null },
    metadata: { type: String, default: null },
    paymentMethod: { type: String, default: null },
    channel: { type: String, default: "WEB" },
    apiResponse: { type: String, default: null },
    adminNote: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

transactionSchema.index({ createdAt: -1 });

export const Transaction =
  (models.Transaction as Model<ITransaction> | undefined) ??
  model<ITransaction>("Transaction", transactionSchema);