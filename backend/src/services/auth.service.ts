import { User, Wallet } from "../models";
import { ApiError } from "../lib/errors";
import { escRegex } from "../lib/utils";
import { hashPassword, verifyPassword } from "./password.service";
import type { IUser } from "../models/user";
import type { IWallet } from "../models/wallet";

export async function findByIdentifier(identifier: string) {
  const trimmed = String(identifier).trim();
  const email = trimmed.toLowerCase();
  const byEmail = await User.findOne({ email });
  if (byEmail) return byEmail;
  const byPhone = await User.findOne({ phone: trimmed });
  if (byPhone) return byPhone;
  return User.findOne({ username: new RegExp(`^${escRegex(trimmed)}$`, "i") });
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  username?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await User.exists({ email });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.", "EMAIL_EXISTS");
  }
  const phoneExists = await User.exists({ phone: input.phone });
  if (phoneExists) {
    throw new ApiError(409, "An account with this phone number already exists.", "EMAIL_EXISTS");
  }
  if (input.username) {
    const usernameTaken = await User.exists({
      username: new RegExp(`^${escRegex(input.username)}$`, "i"),
    });
    if (usernameTaken) {
      throw new ApiError(409, "This username is already taken.", "USERNAME_TAKEN");
    }
  }
  const user = await User.create({
    fullName: input.fullName.trim(),
    email,
    phone: input.phone.trim(),
    password: await hashPassword(input.password),
    role: "USER",
    status: "ACTIVE",
    avatar: null,
    emailVerified: false,
    username: input.username?.trim() || undefined,
    kycStatus: "NONE",
  });
  const wallet = await Wallet.create({ userId: user._id, balance: 0, currency: "NGN" });
  return { user, wallet };
}

export async function loginUser(identifier: string, password: string) {
  const user = await findByIdentifier(identifier);
  if (!user) {
    throw new ApiError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }
  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    throw new ApiError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }
  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "This account has been suspended. Contact support.", "ACCOUNT_SUSPENDED");
  }
  await User.findByIdAndUpdate(user._id, { $set: { lastLoginAt: new Date() } });
  const wallet = await Wallet.findOne({ userId: user._id });
  return { user, wallet };
}

export async function loadSession(userId?: string | null) {
  if (!userId) return null;
  const user = (await User.findById(userId)) as IUser | null;
  if (!user || user.status !== "ACTIVE") return null;
  const wallet = (await Wallet.findOne({ userId: user._id })) as IWallet | null;
  return { user, wallet };
}