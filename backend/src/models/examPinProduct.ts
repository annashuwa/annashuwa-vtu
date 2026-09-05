import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface IExamPinProduct {
  _id: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number | null;
  description?: string | null;
  isActive: boolean;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const examPinProductSchema = new Schema<IExamPinProduct>(
  {
    _id: { type: String, default: () => genId() },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    costPrice: { type: Number, default: null },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
    soldCount: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const ExamPinProduct =
  (models.ExamPinProduct as Model<IExamPinProduct> | undefined) ??
  model<IExamPinProduct>("ExamPinProduct", examPinProductSchema);