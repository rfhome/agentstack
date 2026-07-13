import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRLS } from "@/lib/prisma-rls";
import { generateWeeklySummary, NoSessionsError } from "@/lib/weekly-summary";

export const dynamic = "force-dynamic";

// Sunday midnight UTC — used to skip users who already have a summary this week
function startOfCurrentWeekUTC(): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // rewind to Sunday
  return d;
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
  });

  const weekStart = startOfCurrentWeekUTC();
  const results = { success: 0, failed: 0, skipped: 0 };

  for (const user of users) {
    try {
      // Skip if this user already has a summary for the current week
      const existing = await withRLS(user.id, (db) =>
        db.recommendation.findFirst({
          where: { userId: user.id, domain: "weekly", createdAt: { gte: weekStart } },
          select: { id: true },
        })
      );

      if (existing) {
        results.skipped++;
        continue;
      }

      await generateWeeklySummary(user.id, user.name ?? "Athlete");
      results.success++;
    } catch (err) {
      if (err instanceof NoSessionsError) {
        results.skipped++;
      } else {
        console.error(`[weekly-summary-cron] failed for user ${user.id}:`, err);
        results.failed++;
      }
    }
  }

  console.log(`[weekly-summary-cron] complete — ${JSON.stringify(results)}`);
  return NextResponse.json(results);
}
