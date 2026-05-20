import { NextRequest, NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";
import { getUserContext } from "@/lib/context/userProfile";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are Forge, a strength program architect. Based on the user's recent training history, goals, and user context, prescribe a complete workout for their requested cycle day.

CRITICAL: You MUST generate a workout for the exact cycleDay and cycleLabel specified in requestedCycleDay/cycleLabel. Never substitute a different day. If there is no recent history for that cycle day, use the cycleLabel to determine the muscle group (Push = chest/shoulders/triceps, Pull = back/biceps, Legs = quads/hamstrings/glutes, Arms = biceps/triceps isolation) and prescribe accordingly based on the user's overall training profile.

Return only valid JSON with this exact structure, no markdown, no preamble:
{
  "cycleDay": 1,
  "cycleLabel": "Push",
  "focusStatement": "2-3 sentence description of today's focus and intent",
  "warmup": [
    { "name": "Bike or treadmill", "detail": "5 min easy/moderate" },
    { "name": "Arm circles", "detail": "x15 each direction" }
  ],
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 4,
      "reps": "10,10,10,8",
      "weights": "95,110,120,130",
      "focus": "1-2 cues for execution"
    }
  ],
  "finisher": {
    "label": "Core Finisher",
    "items": ["Front Plank: 3 x 45s/1min/1min", "Side Plank: 30 sec each side (optional)"]
  },
  "cardio": {
    "label": "Cardio Finish",
    "options": ["Option A — Incline Walk: 5-7 min", "Option B — Bike: 5-6 min moderate"],
    "note": "Keep HR in Zone 2"
  },
  "todaysGoal": "1-2 sentences on the session intention — not max effort, focus on quality"
}

The "weights" field is per-set weights as a comma-separated string. Use progressive loading when appropriate. Base prescriptions on the user's actual recent history and goals. For the warm-up, always include 2-3 dynamic movements relevant to the day's muscle groups.`;

const CYCLE_LABELS: Record<number, string> = { 1: "Push", 2: "Pull", 3: "Legs", 4: "Arms" };

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const cycleDay = parseInt(req.nextUrl.searchParams.get("cycleDay") ?? "1");

    const [allRecentSessions, goals, userContext] = await withRLS(userId, (db) =>
      Promise.all([
        db.session.findMany({
          where: { userId },
          take: 8,
          orderBy: { date: "desc" },
          include: { exercises: true },
        }),
        db.goal.findMany({ where: { userId, achieved: false } }),
        getUserContext(userId, db),
      ])
    );

    // Split: last 3 sessions for this specific cycle day (direct history) + recent other days for context
    const dayHistory = allRecentSessions.filter((s) => s.cycleDay === cycleDay).slice(0, 3);
    const otherHistory = allRecentSessions.filter((s) => s.cycleDay !== cycleDay).slice(0, 4);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const serializeSession = (s: typeof allRecentSessions[0]) => ({
      date: s.date.toISOString().split("T")[0],
      cycleDay: s.cycleDay,
      cycleLabel: CYCLE_LABELS[s.cycleDay ?? 0] ?? `Day ${s.cycleDay}`,
      rating: s.rating,
      exercises: s.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weights: e.weights ?? (e.weightLbs ? String(e.weightLbs) : null),
      })),
    });

    const prompt = JSON.stringify({
      requestedCycleDay: cycleDay,
      cycleLabel: CYCLE_LABELS[cycleDay] ?? `Day ${cycleDay}`,
      recentHistoryForThisDay: dayHistory.map(serializeSession),
      otherRecentSessions: otherHistory.map(serializeSession),
      goals: goals.map((g: { exercise: string; targetWeightLbs: number | null; targetReps: string | null }) => ({
        exercise: g.exercise,
        targetWeightLbs: g.targetWeightLbs,
        targetReps: g.targetReps,
      })),
      userContext,
    }, null, 2);

    const res = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const text = res.choices[0].message.content ?? "{}";
    const prescription = JSON.parse(text);

    return NextResponse.json(prescription);
  } catch (err) {
    console.error("[GET /api/prescribe]", err);
    return NextResponse.json({ error: "Failed to prescribe workout" }, { status: 500 });
  }
}
