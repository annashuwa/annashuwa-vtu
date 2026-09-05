import { Notification } from "../models";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  orderId?: string | null;
  link?: string | null;
  category?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    return await Notification.create({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
      orderId: input.orderId ?? null,
      link: input.link ?? null,
      category: input.category ?? null,
    });
  } catch (err) {
    console.error("[notification]", err);
    return null;
  }
}

export async function listNotifications(userId: string, limit = 10) {
  return Notification.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(limit);
}

export async function unreadCount(userId: string) {
  return Notification.countDocuments({ userId, isRead: false });
}

export async function markAllRead(userId: string) {
  return Notification.updateMany({ userId }, { $set: { isRead: true } });
}

export async function markOneRead(userId: string, notificationId: string) {
  return Notification.updateOne({ _id: notificationId, userId }, { $set: { isRead: true } });
}