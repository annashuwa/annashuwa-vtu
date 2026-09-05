import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IPayment {
  _id: string;
  reference: string;
  userId: string;
  transactionId?: string | null;
  amount: number;
  gateway: string;
  status: string;
  fee: number;
  metadata?: string | null;
  initData?: string | null;
  verifyData?: string | null;
  channel?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    _id: { type: String, default: () => genId() },
    reference: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    transactionId: { type: String, default: null },
    amount: { type: Number, required: true },
    gateway: { type: String, default: "TEST" },
    status: { type: String, default: "PENDING", index: true },
    fee: { type: Number, default: 0 },
    metadata: { type: String, default: null },
    initData: { type: String, default: null },
    verifyData: { type: String, default: null },
    channel: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

export const Payment = (models.Payment as Model<IPayment> | undefined) ?? model<IPayment>("Payment", paymentSchema);