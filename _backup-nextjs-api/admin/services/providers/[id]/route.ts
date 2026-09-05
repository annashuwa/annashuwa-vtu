import { NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.fee === "number") data.fee = body.fee;
    const provider = await prisma.serviceProvider.update({ where: { id }, data });
    return NextResponse.json({ provider });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.serviceProvider.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const provider = await prisma.serviceProvider.findUnique({ where: { id }, include: { packages: true } });
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    return NextResponse.json({ provider });
  } catch (err) {
    return jsonError(err);
  }
}