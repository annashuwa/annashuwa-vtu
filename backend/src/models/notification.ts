import { Schema, model, models, type Model } from "mongoose";
import { genId } from "../lib/utils";

export interface INotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    _id: { type: String, default: () => genId() },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "INFO" },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification =
  (models.Notification as Model<INotification> | undefined) ??
  model<INotification>("Notification", notificationSchema);