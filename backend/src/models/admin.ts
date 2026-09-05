import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IAdmin {
  _id: string;
  userId: string;
  title?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    _id: { type: String, default: () => genId() },
    userId: { type: String, required: true, unique: true },
    title: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

export const Admin = (models.Admin as Model<IAdmin> | undefined) ?? model<IAdmin>("Admin", adminSchema);