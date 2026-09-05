import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IWallet {
  _id: string;
  userId: string;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    _id: { type: String, default: () => genId() },
    userId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    currency: { type: String, default: "NGN" },
  },
  { timestamps: true, versionKey: false }
);

export const Wallet = (models.Wallet as Model<IWallet> | undefined) ?? model<IWallet>("Wallet", walletSchema);