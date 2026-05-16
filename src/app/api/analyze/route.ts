import { NextRequest, NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { getUserContext } from "@/lib/context/userProfile";
import { fetchOuraData, formatOuraForLens } from "@/lib/oura";
import { fetchFitbitData, formatFitbitForAgents } from "@/lib/fitbit";
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
  cardioActivities: { tag: string; machine: string; durationMin: number | null; distanceMi: number | null; calories: number | null; avgHR: number | null }[];
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
    cardioActivities: s.cardioActivities.map((c) => ({
      tag: c.tag,
      machine: c.machine,
      durationMin: c.durationMin,
      distanceMi: c.distanceMi,
      calories: c.calories,
      avgHR: c.avgHR,
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

    const [session, recentSessions, goals, userContext, ouraConn, fitbitConn] = await withRLS(userId, (db) =>
      Promise.all([
        db.session.findUnique({
          where: { id: sessionId, userId },
          include: { exercises: true, cardioActivities: true },
        }),
        db.session.findMany({
          where: { userId, id: { not: sessionId } },
          take: 4,
          orderBy: { date: "desc" },
          include: { exercises: true, cardioActivities: true },
        }),
        db.goal.findMany({ where: { userId, achieved: false } }),
        getUserContext(userId, db),
        db.wearableConnection.findUnique({
          where: { userId_provider: { userId, provider: "oura" } },
          select: { id: true },
        }),
        db.wearableConnection.findUnique({
          where: { userId_provider: { userId, provider: "fitbit" } },
          select: { id: true },
        }),
      ])
    );

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

    let fitbitContext: string | undefined;
    if (fitbitConn) {
      try {
        const fitbitData = await fetchFitbitData(userId);
        fitbitContext = formatFitbitForAgents(fitbitData);
      } catch {
        // Fitbit fetch failed — agents proceed without it
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
      fitbitContext,
    };

    const result = await runOrchestrator(input);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
