import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { getUserContext } from "@/lib/context/userProfile";
import type { AgentInput, SessionSummary } from "@/lib/agents/types";

function toSessionSummary(s: {
  date: Date;
  cycleDay: number | null;
  durationMinutes: number | null;
  avgHeartRate: number | null;
  cardioLoad: number | null;
  activeZoneMinutes: number | null;
  rating: string | null;
  notes: string | null;
  exercises: { name: string; sets: number | null; reps: string | null; weightLbs: number | null }[];
}): SessionSummary {
  return {
    date: s.date.toISOString().split("T")[0],
    cycleDay: s.cycleDay ?? 0,
    durationMinutes: s.durationMinutes ?? 0,
    avgHeartRate: s.avgHeartRate ?? 0,
    cardioLoad: s.cardioLoad ?? 0,
    activeZoneMinutes: s.activeZoneMinutes ?? 0,
    rating: s.rating ?? undefined,
    notes: s.notes ?? undefined,
    exercises: s.exercises.map((e) => ({
      name: e.name,
      sets: e.sets ?? 0,
      reps: e.reps ?? "",
      weightLbs: e.weightLbs ?? 0,
    })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = (await req.json()) as { sessionId: number };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const [session, recentSessions, goals, userContext] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: { exercises: true },
      }),
      prisma.session.findMany({
        where: { id: { not: sessionId } },
        take: 4,
        orderBy: { date: "desc" },
        include: { exercises: true },
      }),
      prisma.goal.findMany({ where: { achieved: false } }),
      getUserContext(),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const input: AgentInput = {
      sessionId,
      sessionData: toSessionSummary(session),
      recentHistory: recentSessions.map(toSessionSummary),
      goals: goals.map((g: { exercise: string; targetWeightLbs: number | null; targetReps: string | null }) => ({
        exercise: g.exercise,
        targetWeightLbs: g.targetWeightLbs ?? 0,
        targetReps: g.targetReps ?? "",
      })),
      userContext,
    };

    const result = await runOrchestrator(input);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
