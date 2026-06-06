import { NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

function parseMaxWeight(weights: string | null | undefined, weightLbs: number | null | undefined): number | null {
  if (weights) {
    const nums = weights.split(",").map(Number).filter(n => !isNaN(n) && n > 0);
    if (nums.length) return Math.max(...nums);
  }
  return weightLbs ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [exercises, sessions] = await withRLS(userId, (db) =>
    Promise.all([
      db.exercise.findMany({
        where: { session: { userId } },
        include: { session: { select: { date: true } } },
        orderBy: { session: { date: "asc" } },
      }),
      db.session.findMany({
        where: { userId },
        select: { date: true },
        orderBy: { date: "asc" },
      }),
    ])
  );

  // ── Exercise progress charts ──────────────────────────────────────────────
  const grouped = new Map<string, { displayName: string; dataPoints: { date: string; maxWeight: number | null; totalSets: number | null }[] }>();

  for (const ex of exercises) {
    const key = ex.name.trim().toLowerCase();
    const date = ex.session.date.toISOString().split("T")[0];
    const maxWeight = parseMaxWeight(ex.weights, ex.weightLbs);
    const totalSets = ex.sets ?? null;

    if (!grouped.has(key)) {
      grouped.set(key, { displayName: ex.name.trim(), dataPoints: [] });
    }
    grouped.get(key)!.dataPoints.push({ date, maxWeight, totalSets });
  }

  const progressResult: { name: string; dataPoints: { date: string; maxWeight: number | null; totalSets: number | null }[] }[] = [];

  for (const { displayName, dataPoints } of grouped.values()) {
    if (dataPoints.length < 2) continue;
    if (!dataPoints.some(d => d.maxWeight !== null)) continue;
    progressResult.push({ name: displayName, dataPoints });
  }
  progressResult.sort((a, b) => b.dataPoints.length - a.dataPoints.length);

  // ── Personal records: all-time max weight per exercise ───────────────────
  const prMap = new Map<string, { name: string; maxWeight: number; date: string }>();
  for (const ex of exercises) {
    const key = ex.name.trim().toLowerCase();
    const weight = parseMaxWeight(ex.weights, ex.weightLbs);
    if (weight === null) continue;
    const date = ex.session.date.toISOString().split("T")[0];
    const existing = prMap.get(key);
    if (!existing || weight > existing.maxWeight) {
      prMap.set(key, { name: ex.name.trim(), maxWeight: weight, date });
    }
  }
  const prs = Array.from(prMap.values())
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, 12);

  // ── Frequency heatmap: one cell per day for the last 52 weeks ───────────
  const trainingDays = new Set(sessions.map((s) => s.date.toISOString().split("T")[0]));

  return NextResponse.json({
    exercises: progressResult.slice(0, 10),
    prs,
    trainingDays: Array.from(trainingDays),
  });
}
