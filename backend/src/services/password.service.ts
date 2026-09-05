import bcrypt from "bcryptjs";
import { ApiError } from "../lib/errors";
import { sha256, randomToken } from "../lib/utils";
import { User, PasswordResetToken } from "../models";
import { createNotification } from "./notification.service";
import { createAuditLog } from "../lib/audit";
import { revokeAllForUser } from "./refresh-token.service";
import { APP_URL, isDev } from "../config";
import { sendEmail } from "./messenger";
import type { Request } from "express";

const PASSWORD_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function readonlyResetMessage() {
  return "If an account exists for this email, a reset link has been sent.";
}

export async function createPasswordReset(userId: string, email: string, _req?: Request) {
  const rawToken = randomToken(32);
  await PasswordResetToken.create({
    userId,
    tokenHash: sha256(rawToken),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    used: false,
  });
  await createNotification({
    userId,
    title: "Password reset requested",
    message: "We received a request to reset your password.",
    type: "INFO",
  });
  const link = `${APP_URL}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: email,
    subject: "Reset your ANNASHUWA VTU password",
    text: `We received a request to reset your password. Open this link within 15 minutes to choose a new one:\n\n${link}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your password. Open the link below within 15 minutes:</p><p><a href="${link}">${link}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
  });
  return isDev ? { link, devResetLink: link, rawToken } : {};
}

export async function handleForgotPassword(email: string, req?: Request) {
  const user = await User.findOne({ email });
  if (!user) {
    return {
      message: readonlyResetMessage(),
      ...(isDev ? { devResetLink: "" } : {}),
    };
  }
  const { rawToken } = await createPasswordReset(String(user._id), email, req);
  return {
    message: readonlyResetMessage(),
    ...(isDev ? { devResetLink: `${APP_URL}/reset-password?token=${rawToken}` } : {}),
  };
}

export async function handleResetPassword(token: string, password: string, req?: Request) {
  const tokenHash = sha256(token);
  const record = await PasswordResetToken.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  if (!record) {
    throw new ApiError(400, "This reset link is invalid or has expired. Please request a new one.", "INVALID_TOKEN");
  }
  const newPasswordHash = await hashPassword(password);
  await User.findByIdAndUpdate(record.userId, { $set: { password: newPasswordHash } });
  await PasswordResetToken.findByIdAndUpdate(record._id, { $set: { used: true } });
  await PasswordResetToken.updateMany(
    { userId: record.userId, _id: { $ne: record._id }, used: false },
    { $set: { used: true } }
  );
  // A password reset must kill every existing session/refresh token, otherwise
  // a stolen refresh token (30-day life) survives the reset.
  await revokeAllForUser(record.userId);
  await createNotification({
    userId: record.userId,
    title: "Password changed",
    message: "Your password has been reset successfully. You can now sign in.",
    type: "SUCCESS",
  });
  await createAuditLog({
    userId: record.userId,
    action: "AUTH_PASSWORD_RESET",
    entityType: "User",
    entityId: record.userId,
    req,
  });
  return { message: "Password reset successful. You can now sign in." };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, req?: Request) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, "You must be logged in to perform this action.");
  const ok = await verifyPassword(currentPassword, user.password);
  if (!ok) {
    throw new ApiError(400, "Current password is incorrect", "INVALID_PASSWORD");
  }
  await User.findByIdAndUpdate(userId, { $set: { password: await hashPassword(newPassword) } });
  // Same as reset: changing the password revokes all other sessions so a
  // compromised token cannot outlive the password change.
  await revokeAllForUser(userId);
  await createAuditLog({ userId, action: "PASSWORD_CHANGED", entityType: "User", entityId: userId, req });
  return { message: "Password changed successfully" };
}