import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";
import { fetchOuraData, formatOuraForLens } from "@/lib/oura";
import { getUserContext } from "@/lib/context/userProfile";
import { extractJSON } from "@/lib/agents/parse";
import { wrapAgentInput, SECURITY_CANARY } from "@/lib/security";

export const dynamic = "force-dynamic";

const WEEKLY_SUMMARY_SYSTEM_PROMPT = (userName: string) =>
  `You are Nexus generating a weekly training summary for ${userName}. Analyze the past 7 days of training data vs the previous 7 days. Synthesize: session count and volume trend, any PRs or regressions, recovery pattern from available wearable data, and one clear focus recommendation for the coming week.

Return only valid JSON, no markdown:
{
  "weekOf": "string — date range e.g. May 10–16",
  "headline": "string — one punchy sentence summarizing the week",
  "content": "string — 3-4 sentence narrative paragraph",
  "stats": { "sessionsThisWeek": number, "sessionsPrevWeek": number },
  "nextActions": ["string", "string", "string"]
}
${SECURITY_CANARY}`;

/** Slim session shape — only what Nexus needs for a weekly rollup. */
function slimSession(s: {
  date: Date;
  cycleDay?: number | null;
  durationMinutes?: number | null;
  avgHeartRate?: number | null;
  rating?: string | null;
  notes?: string | null;
  exercises: { name: string; sets?: number | null; reps?: string | null; weights?: string | null }[];
}) {
  return {
    date: s.date.toISOString().slice(0, 10),
    cycleDay: s.cycleDay ?? undefined,
    durationMin: s.durationMinutes ?? undefined,
    avgHR: s.avgHeartRate ?? undefined,
    rating: s.rating ?? undefined,
    notes: s.notes ? s.notes.slice(0, 200) : undefined,
    exercises: s.exercises.map((e) => ({
      name: e.name,
      sets: e.sets ?? undefined,
      reps: e.reps ?? undefined,
      weights: e.weights ?? undefined,
    })),
  };
}

export async function GET() {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;

    const latest = await withRLS(userId, (db) => db.recommendation.findFirst({
      where: { userId, domain: "weekly" },
      orderBy: { createdAt: "desc" },
    }));

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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [sessions, prevSessions, ouraConn, userContext] = await withRLS(userId, (db) =>
      Promise.all([
        db.session.findMany({
          where: { userId, date: { gte: sevenDaysAgo } },
          orderBy: { date: "desc" },
          take: 14,
          select: {
            date: true,
            cycleDay: true,
            durationMinutes: true,
            avgHeartRate: true,
            rating: true,
            notes: true,
            exercises: {
              select: { name: true, sets: true, reps: true, weights: true },
            },
          },
        }),
        db.session.findMany({
          where: { userId, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
          orderBy: { date: "desc" },
          take: 14,
          select: {
            date: true,
            cycleDay: true,
            durationMinutes: true,
            avgHeartRate: true,
            rating: true,
            notes: true,
            exercises: {
              select: { name: true, sets: true, reps: true, weights: true },
            },
          },
        }),
        db.wearableConnection.findUnique({
          where: { userId_provider: { userId, provider: "oura" } },
          select: { id: true },
        }),
        getUserContext(userId, db),
      ])
    );

    let ouraContext: string | undefined;
    if (ouraConn) {
      try {
        const ouraData = await fetchOuraData(userId);
        ouraContext = formatOuraForLens(ouraData);
      } catch {
        // Oura fetch failed — proceed without it
      }
    }

    // Trim userContext to avoid runaway token counts from large profiles
    const trimmedContext = userContext ? userContext.slice(0, 2000) : undefined;

    const rawInput = JSON.stringify({
      thisWeek: sessions.map(slimSession),
      previousWeek: prevSessions.map(slimSession),
      ...(ouraContext ? { ouraData: ouraContext } : {}),
      ...(trimmedContext ? { userContext: trimmedContext } : {}),
    });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: WEEKLY_SUMMARY_SYSTEM_PROMPT(userName),
      messages: [{ role: "user", content: wrapAgentInput(rawInput) }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;

    type SynthesisShape = {
      weekOf: string;
      headline: string;
      content: string;
      stats: { sessionsThisWeek: number; sessionsPrevWeek: number };
      nextActions: string[];
    };
    const synthesis = extractJSON<SynthesisShape>(text, {
      weekOf: "",
      headline: "",
      content: text,
      stats: { sessionsThisWeek: sessions.length, sessionsPrevWeek: prevSessions.length },
      nextActions: [],
    });

    const safeNextActions = Array.isArray(synthesis.nextActions) ? synthesis.nextActions : [];

    await withRLS(userId, (db) => db.recommendation.create({
      data: {
        userId,
        domain: "weekly",
        content: synthesis.content ?? "",
        nextActions: safeNextActions,
      },
    }));

    return NextResponse.json(synthesis);
  } catch (err) {
    console.error("[POST /api/weekly-summary]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to generate weekly summary" }, { status: 500 });
  }
}
