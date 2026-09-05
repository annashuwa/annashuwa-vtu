import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IPasswordResetToken {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    _id: { type: String, default: () => genId() },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const PasswordResetToken =
  (models.PasswordResetToken as Model<IPasswordResetToken> | undefined) ??
  model<IPasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);