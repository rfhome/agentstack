import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const recommendations = await prisma.recommendation.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        session: {
          select: { id: true, date: true, cycleDay: true, rating: true },
        },
      },
    });
    return NextResponse.json(recommendations);
  } catch (err) {
    console.error("[GET /api/recommendations]", err);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
