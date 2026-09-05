import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IServicePackage {
  _id: string;
  providerId: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  costPrice?: number | null;
  providerPlans?: Record<string, { code?: string; cost?: number }>;
  duration?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
}

const providerPlanSchema = new Schema(
  {
    code: { type: String },
    cost: { type: Number },
  },
  { _id: false }
);

const servicePackageSchema = new Schema<IServicePackage>(
  {
    _id: { type: String, default: () => genId() },
    providerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number, default: null },
    costPrice: { type: Number, default: null },
    providerPlans: { type: Map, of: providerPlanSchema, default: {} },
    duration: { type: String, default: null },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export const ServicePackage =
  (models.ServicePackage as Model<IServicePackage> | undefined) ??
  model<IServicePackage>("ServicePackage", servicePackageSchema);