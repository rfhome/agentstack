import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";
import { fetchOuraData, formatOuraForLens } from "@/lib/oura";
import { getUserContext } from "@/lib/context/userProfile";

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
}`;

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
          include: { exercises: true, cardioActivities: true },
        }),
        db.session.findMany({
          where: { userId, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
          orderBy: { date: "desc" },
          include: { exercises: true },
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

    const prompt = JSON.stringify(
      {
        thisWeek: sessions,
        previousWeek: prevSessions,
        ...(ouraContext ? { ouraData: ouraContext } : {}),
        ...(userContext ? { userContext } : {}),
      },
      null,
      2
    );

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: WEEKLY_SUMMARY_SYSTEM_PROMPT(userName),
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    const objectMatch = text.match(/(\{[\s\S]*\})/);
    const clean = fenceMatch?.[1] ?? objectMatch?.[1] ?? text;

    let synthesis: {
      weekOf: string;
      headline: string;
      content: string;
      stats: { sessionsThisWeek: number; sessionsPrevWeek: number };
      nextActions: string[];
    };
    try {
      synthesis = JSON.parse(clean);
    } catch {
      synthesis = {
        weekOf: "",
        headline: "",
        content: text,
        stats: { sessionsThisWeek: sessions.length, sessionsPrevWeek: prevSessions.length },
        nextActions: [],
      };
    }

    await withRLS(userId, (db) => db.recommendation.create({
      data: {
        userId,
        domain: "weekly",
        content: synthesis.content,
        nextActions: synthesis.nextActions,
      },
    }));

    return NextResponse.json(synthesis);
  } catch (err) {
    console.error("[POST /api/weekly-summary]", err);
    return NextResponse.json({ error: "Weekly summary generation failed" }, { status: 500 });
  }
}
