import { NextRequest, NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { setJob, type AchievedGoal } from "@/lib/analyze-jobs";
import { exerciseMatchesGoal, getMaxWeight, meetsWeightTarget, meetsRepsTarget } from "@/lib/goals";
import { getUserContext } from "@/lib/context/userProfile";
import { fetchOuraData, formatOuraForLens, type OuraData, type OuraReadiness, type OuraSleep } from "@/lib/oura";
import { fetchFitbitData, formatFitbitForAgents } from "@/lib/fitbit";
import { formatAppleHealthForLens } from "@/lib/apple-health";
import { checkRateLimit } from "@/lib/security";
import type { AgentInput, SessionSummary, SessionImage, RecentActivity } from "@/lib/agents/types";

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

type GoalRow = { id: number; exercise: string; targetWeightLbs: number | null; targetReps: string | null };
type ExerciseRow = { name: string; weightLbs: number | null; weights: string | null; reps: string | null };

async function checkAndUpdateGoals(
  userId: string,
  exercises: ExerciseRow[],
  goals: GoalRow[]
): Promise<AchievedGoal[]> {
  const achieved: AchievedGoal[] = [];

  for (const goal of goals) {
    const match = exercises.find((ex) => exerciseMatchesGoal(ex.name, goal.exercise));
    if (!match) continue;

    const maxWeight = getMaxWeight(match.weightLbs, match.weights);
    if (!meetsWeightTarget(maxWeight, goal.targetWeightLbs)) continue;
    if (!meetsRepsTarget(match.reps, goal.targetReps)) continue;

    const prevTargetLbs = goal.targetWeightLbs ?? maxWeight;
    const newTargetLbs = prevTargetLbs + 5;

    await prisma.goal.update({ where: { id: goal.id }, data: { achieved: true, achievedAt: new Date() } });
    await prisma.goal.create({
      data: { userId, exercise: goal.exercise, targetWeightLbs: newTargetLbs, targetReps: goal.targetReps },
    });

    achieved.push({ exercise: goal.exercise, prevTargetLbs, newTargetLbs });
  }

  return achieved;
}

export async function POST(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;

    // Rate limit: max 15 analyses per user per hour (each burns 4–5 API calls)
    const rateCheck = checkRateLimit(userId, "analyze", 15);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many analysis requests. Please wait before running another analysis." },
        { status: 429 }
      );
    }

    const { sessionId } = (await req.json()) as { sessionId: number };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const sessionDateCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [session, recentSessions, goals, userContext, ouraConn, fitbitConn, recentActivitiesRaw, appleHealthDays] = await withRLS(userId, (db) =>
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
        db.activity.findMany({
          where: { userId, date: { gte: sessionDateCutoff } },
          orderBy: { date: "desc" },
          take: 10,
          select: { type: true, date: true, durationMin: true, distanceMi: true, avgHR: true, calories: true, notes: true },
        }),
        db.appleHealthDay.findMany({
          where: { userId, date: { gte: sessionDateCutoff.toISOString().slice(0, 10) } },
          orderBy: { date: "desc" },
          take: 7,
        }),
      ])
    );

    const recentActivities: RecentActivity[] = recentActivitiesRaw.map((a) => ({
      type: a.type,
      date: a.date.toISOString().split("T")[0],
      durationMin: a.durationMin,
      distanceMi: a.distanceMi,
      avgHR: a.avgHR,
      calories: a.calories,
      notes: a.notes,
    }));

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionDate = session.date.toISOString().split("T")[0];
    const storedSnapshot = (session.wearableSnapshot ?? {}) as Record<string, unknown>;

    let ouraContext: string | undefined;
    if (ouraConn) {
      try {
        const ouraData = await fetchOuraData(userId, sessionDate);
        // Merge stored recovery (readiness/sleep from save time) with fresh activity data
        const stored = storedSnapshot.oura as { readiness?: OuraReadiness; sleep?: OuraSleep } | undefined;
        const merged: OuraData = {
          ...ouraData,
          readiness: ouraData.readiness ?? stored?.readiness ?? null,
          sleep: ouraData.sleep ?? stored?.sleep ?? null,
        };
        ouraContext = formatOuraForLens(merged);
      } catch {
        // Fall back to stored snapshot if live fetch fails
        const stored = storedSnapshot.oura as { readiness?: OuraReadiness; sleep?: OuraSleep } | undefined;
        if (stored) {
          ouraContext = formatOuraForLens({ readiness: stored.readiness ?? null, sleep: stored.sleep ?? null, activity: null, fetchedAt: "" });
        }
      }
    }

    let fitbitContext: string | undefined;
    if (fitbitConn) {
      try {
        const fitbitData = await fetchFitbitData(userId, sessionDate);
        fitbitContext = formatFitbitForAgents(fitbitData);
      } catch {
        // Fitbit fetch failed — agents proceed without it
      }
    }

    const sessionImages = (session.images ?? []) as unknown as SessionImage[];

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
      appleHealthContext: appleHealthDays.length > 0
        ? formatAppleHealthForLens(appleHealthDays.map(d => ({
            date: d.date,
            hrv:        d.hrv        ?? undefined,
            restingHR:  d.restingHR  ?? undefined,
            sleepHours: d.sleepHours ?? undefined,
            activeKcal: d.activeKcal ?? undefined,
            steps:      d.steps      ?? undefined,
          })))
        : undefined,
      recentActivities: recentActivities.length > 0 ? recentActivities : undefined,
      images: sessionImages.length > 0 ? sessionImages : undefined,
    };

    // Mark job as processing and fire the orchestrator in the background.
    // Railway runs a persistent Node.js server so the promise survives after
    // we return the 202 response.
    setJob(sessionId, { status: "processing" });
    const t0 = Date.now();

    runOrchestrator(input)
      .then(async (orchestratorResult) => {
        const achievedGoals = await checkAndUpdateGoals(userId, session!.exercises, goals);
        console.log(`[analyze] session ${sessionId} completed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        setJob(sessionId, {
          status: "completed",
          result: { ...orchestratorResult, achievedGoals: achievedGoals.length > 0 ? achievedGoals : undefined },
        });
      })
      .catch((err: unknown) => {
        console.error(`[analyze] session ${sessionId} failed after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, err);
        setJob(sessionId, {
          status: "failed",
          error: err instanceof Error ? err.message : "Analysis failed",
        });
      });

    return NextResponse.json({ status: "processing" }, { status: 202 });
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
