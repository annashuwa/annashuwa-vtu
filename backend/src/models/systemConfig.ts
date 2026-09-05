import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface ISystemConfig {
  _id: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    _id: { type: String, default: () => genId() },
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false }
);

export const SystemConfig =
  (models.SystemConfig as Model<ISystemConfig> | undefined) ??
  model<ISystemConfig>("SystemConfig", systemConfigSchema);