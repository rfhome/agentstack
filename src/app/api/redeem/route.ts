import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;

    const body = (await req.json()) as { code?: string };
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const promo = await prisma.promoCode.findUnique({ where: { code } });
    if (!promo) {
      return NextResponse.json({ error: "Invalid code" }, { status: 404 });
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return NextResponse.json({ error: "This code has expired" }, { status: 410 });
    }
    if (promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ error: "This code has reached its usage limit" }, { status: 410 });
    }

    // Check if user already has an equal or higher tier
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
    const TIER_RANK: Record<string, number> = { free: 0, beta: 1, premium: 2 };
    const currentRank = TIER_RANK[user?.tier ?? "free"] ?? 0;
    const newRank = TIER_RANK[promo.tier] ?? 0;
    if (currentRank >= newRank) {
      return NextResponse.json({ error: "You already have this access level or higher" }, { status: 409 });
    }

    // Upgrade user tier and increment usage atomically
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { tier: promo.tier } }),
      prisma.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } }),
    ]);

    return NextResponse.json({ tier: promo.tier });
  } catch (err) {
    console.error("[POST /api/redeem]", err);
    return NextResponse.json({ error: "Redemption failed" }, { status: 500 });
  }
}
