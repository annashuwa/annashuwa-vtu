import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IRefreshToken {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenHash?: string | null;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    _id: { type: String, default: () => genId() },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const RefreshToken =
  (models.RefreshToken as Model<IRefreshToken> | undefined) ??
  model<IRefreshToken>("RefreshToken", refreshTokenSchema);