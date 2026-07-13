import { NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";
import { generateWeeklySummary, NoSessionsError } from "@/lib/weekly-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;

    const latest = await withRLS(userId, (db) =>
      db.recommendation.findFirst({
        where: { userId, domain: "weekly" },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json({ summary: latest ?? null });
  } catch (err) {
    console.error("[GET /api/weekly-summary]", err);
    return NextResponse.json({ error: "Failed to fetch weekly summary" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;
    const userName = authSession.user.name ?? "Athlete";

    const synthesis = await generateWeeklySummary(userId, userName);
    return NextResponse.json(synthesis);
  } catch (err) {
    if (err instanceof NoSessionsError) {
      return NextResponse.json({ quiet: "Looks like a rest week — come back after your next session." }, { status: 200 });
    }
    console.error("[POST /api/weekly-summary]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to generate weekly summary" }, { status: 500 });
  }
}
