import { NextResponse } from "next/server";
import { getSessionUser, jsonError } from "@/lib/auth";
import { serializeUser } from "@/lib/serialize";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: serializeUser(user) });
  } catch (err) {
    return jsonError(err);
  }
}