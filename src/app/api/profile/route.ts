import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const profile = await prisma.userProfile.findFirst({ where: { userId } });

    return NextResponse.json({
      name: profile?.name ?? "",
      context: profile?.context ?? "",
    });
  } catch (err) {
    console.error("[GET /api/profile]", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { name, context } = (await req.json()) as { name: string; context: string };

    const existing = await prisma.userProfile.findFirst({ where: { userId } });
    if (existing) {
      await prisma.userProfile.update({ where: { id: existing.id }, data: { name, context } });
    } else {
      await prisma.userProfile.create({ data: { userId, name, context } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/profile]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
