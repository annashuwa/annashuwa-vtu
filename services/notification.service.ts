import { prisma } from "@/lib/prisma";

export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? "INFO",
      },
    });
  } catch (err) {
    console.error("[notification]", err);
    return null;
  }
}

export async function listNotifications(userId: string, limit = 10) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId }, data: { isRead: true } });
}