import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { computeStreaks } from "@/lib/streaks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;

    const [sessions, achievedGoals] = await withRLS(userId, (db) =>
      Promise.all([
        db.session.findMany({
          where: { userId },
          select: { date: true },
          orderBy: { date: "desc" },
        }),
        db.goal.count({ where: { userId, achieved: true } }),
      ])
    );

    const streaks = computeStreaks(sessions.map((s) => s.date));

    return NextResponse.json({
      ...streaks,
      goalsAchieved: achievedGoals,
    });
  } catch (err) {
    console.error("[GET /api/stats]", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
