import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { getUserContext } from "@/lib/context/userProfile";
import { fetchOuraData, formatOuraForLens } from "@/lib/oura";
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
  exercises: { name: string; sets: number | null; reps: string | null; weightLbs: number | null; weights: string | null }[];
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
      weights: e.weights ?? undefined,
    })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;

    const { sessionId } = (await req.json()) as { sessionId: number };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const [session, recentSessions, goals, userContext, ouraConn] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId, userId },
        include: { exercises: true },
      }),
      prisma.session.findMany({
        where: { userId, id: { not: sessionId } },
        take: 4,
        orderBy: { date: "desc" },
        include: { exercises: true },
      }),
      prisma.goal.findMany({ where: { userId, achieved: false } }),
      getUserContext(userId),
      prisma.wearableConnection.findUnique({
        where: { userId_provider: { userId, provider: "oura" } },
        select: { id: true },
      }),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let ouraContext: string | undefined;
    if (ouraConn) {
      try {
        const ouraData = await fetchOuraData(userId);
        ouraContext = formatOuraForLens(ouraData);
      } catch {
        // Oura fetch failed — agents proceed without it
      }
    }

    const input: AgentInput = {
      sessionId,
      userId,
      sessionData: toSessionSummary(session),
      recentHistory: recentSessions.map(toSessionSummary),
      goals: goals.map((g: { exercise: string; targetWeightLbs: number | null; targetReps: string | null }) => ({
        exercise: g.exercise,
        targetWeightLbs: g.targetWeightLbs ?? 0,
        targetReps: g.targetReps ?? "",
      })),
      userContext,
      ouraContext,
    };

    const result = await runOrchestrator(input);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
