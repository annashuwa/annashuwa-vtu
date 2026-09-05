import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IDataPlan {
  _id: string;
  network: string;
  planName: string;
  size: string;
  validity: string;
  price: number;
  oldPrice?: number | null;
  costPrice?: number | null;
  providerPlans?: Record<string, { code?: string; cost?: number }>;
  kind: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const providerPlanSchema = new Schema(
  {
    code: { type: String },
    cost: { type: Number },
  },
  { _id: false }
);

const dataPlanSchema = new Schema<IDataPlan>(
  {
    _id: { type: String, default: () => genId() },
    network: { type: String, required: true, index: true },
    planName: { type: String, required: true },
    size: { type: String, required: true },
    validity: { type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number, default: null },
    costPrice: { type: Number, default: null },
    providerPlans: { type: Map, of: providerPlanSchema, default: {} },
    kind: { type: String, default: "DATA" },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

export const DataPlan =
  (models.DataPlan as Model<IDataPlan> | undefined) ?? model<IDataPlan>("DataPlan", dataPlanSchema);