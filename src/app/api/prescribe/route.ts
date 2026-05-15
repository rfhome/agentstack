import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/context/userProfile";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are Forge, a strength program architect. Based on the user's recent training history, goals, and user context, prescribe the exact exercises for their requested cycle day.

Return only valid JSON with this structure, no markdown, no preamble:
{
  "cycleDay": 1,
  "cycleLabel": "Push",
  "guidance": "one sentence on the focus for today",
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 4,
      "reps": "8,8,8,8",
      "weights": "45,45,47.5,47.5",
      "notes": "optional cue"
    }
  ]
}

The "weights" field is per-set weights as a comma-separated string matching the number of sets. If progressive, vary them. If the user has no history on an exercise, recommend a starting weight based on the cycle context.`;

const CYCLE_LABELS: Record<number, string> = { 1: "Push", 2: "Pull", 3: "Legs", 4: "Arms" };

export async function GET(req: NextRequest) {
  try {
    const cycleDay = parseInt(req.nextUrl.searchParams.get("cycleDay") ?? "1");

    const [recentSessions, goals, userContext] = await Promise.all([
      prisma.session.findMany({
        where: { cycleDay },
        take: 3,
        orderBy: { date: "desc" },
        include: { exercises: true },
      }),
      prisma.goal.findMany({ where: { achieved: false } }),
      getUserContext(),
    ]);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = JSON.stringify({
      requestedCycleDay: cycleDay,
      cycleLabel: CYCLE_LABELS[cycleDay] ?? `Day ${cycleDay}`,
      recentSessions: recentSessions.map((s) => ({
        date: s.date.toISOString().split("T")[0],
        exercises: s.exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weights: e.weights ?? (e.weightLbs ? String(e.weightLbs) : null),
        })),
      })),
      goals: goals.map((g) => ({
        exercise: g.exercise,
        targetWeightLbs: g.targetWeightLbs,
        targetReps: g.targetReps,
      })),
      userContext,
    }, null, 2);

    const res = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
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
