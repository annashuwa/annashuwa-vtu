import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IWalletTransaction {
  _id: string;
  walletId: string;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  status: string;
  reference: string;
  description?: string | null;
  metadata?: string | null;
  transactionId?: string | null;
  createdAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    _id: { type: String, default: () => genId() },
    walletId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    amount: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    status: { type: String, default: "SUCCESSFUL" },
    reference: { type: String, required: true, index: true },
    description: { type: String, default: null },
    metadata: { type: String, default: null },
    transactionId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

walletTransactionSchema.index({ createdAt: -1 });

export const WalletTransaction =
  (models.WalletTransaction as Model<IWalletTransaction> | undefined) ??
  model<IWalletTransaction>("WalletTransaction", walletTransactionSchema);