import { NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recommendations = await withRLS(session.user.id, (db) => db.recommendation.findMany({
      where: { userId: session.user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        session: {
          select: { id: true, date: true, cycleDay: true, rating: true },
        },
      },
    }));
    return NextResponse.json(recommendations);
  } catch (err) {
    console.error("[GET /api/recommendations]", err);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
