import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

const idSchema = { type: String, default: () => genId() };

export interface KycFields {
  idType?: string;
  idNumber?: string;
  documentUrl?: string;
  submittedAt?: Date;
}

export interface IUser {
  _id: string;
  id: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  status: string;
  avatar?: string | null;
  emailVerified: boolean;
  username?: string | null;
  lastLoginAt?: Date | null;
  kycStatus: string;
  kycFields?: KycFields | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: idSchema,
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, default: "USER" },
    status: { type: String, default: "ACTIVE" },
    avatar: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    // Absent (undefined) when unset so the sparse unique index below skips it.
    // An explicit null WOULD be indexed and allow only one null-username user.
    username: { type: String, default: undefined },
    lastLoginAt: { type: Date, default: null },
    kycStatus: { type: String, default: "NONE" },
    kycFields: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ kycStatus: 1 });
userSchema.index({ username: 1 }, { unique: true, sparse: true });

export const User = (models.User as Model<IUser> | undefined) ?? model<IUser>("User", userSchema);
export type UserDoc = InstanceType<typeof User>;