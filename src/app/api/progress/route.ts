import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const exercises = await prisma.exercise.findMany({
    where: { session: { userId: session.user.id } },
    include: { session: { select: { date: true } } },
    orderBy: { session: { date: "asc" } },
  });

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

  const result: { name: string; dataPoints: { date: string; maxWeight: number | null; totalSets: number | null }[] }[] = [];

  for (const { displayName, dataPoints } of grouped.values()) {
    if (dataPoints.length < 2) continue;
    if (!dataPoints.some(d => d.maxWeight !== null)) continue;
    result.push({ name: displayName, dataPoints });
  }

  result.sort((a, b) => b.dataPoints.length - a.dataPoints.length);

  return NextResponse.json({ exercises: result.slice(0, 10) });
}
