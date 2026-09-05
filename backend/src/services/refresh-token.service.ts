import { RefreshToken } from "../models";
import { sha256, randomToken } from "../lib/utils";
import { ApiError } from "../lib/errors";

export const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomToken(48);
  await RefreshToken.create({
    userId,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS),
  });
  return raw;
}

export async function verifyRefreshToken(raw: string): Promise<string | null> {
  const record = await RefreshToken.findOne({ tokenHash: sha256(raw) });
  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return record.userId;
}

export async function rotateRefreshToken(raw: string): Promise<{ userId: string; newToken: string }> {
  const record = await RefreshToken.findOne({ tokenHash: sha256(raw) });
  if (!record || record.revokedAt) {
    // Reuse of a revoked/unknown token: revoke the whole family to be safe.
    if (record?.userId) {
      await RefreshToken.updateMany({ userId: record.userId }, { $set: { revokedAt: new Date() } });
    }
    throw new ApiError(401, "Invalid or expired refresh token.", "INVALID_REFRESH_TOKEN");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, "Invalid or expired refresh token.", "INVALID_REFRESH_TOKEN");
  }
  const newToken = await issueRefreshToken(record.userId);
  await RefreshToken.findByIdAndUpdate(record._id, {
    $set: { revokedAt: new Date(), replacedByTokenHash: sha256(newToken) },
  });
  return { userId: record.userId, newToken };
}

export async function revokeAllForUser(userId: string) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}