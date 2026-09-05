import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/auth";
import { listNotifications, unreadCount } from "@/services/notification.service";

export async function GET() {
  try {
    const user = await requireUser();
    const [items, count] = await Promise.all([listNotifications(user.id, 20), unreadCount(user.id)]);
    return NextResponse.json({
      data: items.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unread: count,
    });
  } catch (err) {
    return jsonError(err);
  }
}