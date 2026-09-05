import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/auth";
import { markAllRead } from "@/services/notification.service";

export async function POST() {
  try {
    const user = await requireUser();
    await markAllRead(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}