import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IServiceProvider {
  _id: string;
  category: string;
  name: string;
  code: string;
  imageUrl?: string | null;
  description?: string | null;
  fee: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceProviderSchema = new Schema<IServiceProvider>(
  {
    _id: { type: String, default: () => genId() },
    category: { type: String, required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    imageUrl: { type: String, default: null },
    description: { type: String, default: null },
    fee: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

export const ServiceProvider =
  (models.ServiceProvider as Model<IServiceProvider> | undefined) ??
  model<IServiceProvider>("ServiceProvider", serviceProviderSchema);