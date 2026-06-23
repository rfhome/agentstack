import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getJob } from "@/lib/analyze-jobs";
import type { AgentResponse } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const sessionId = parseInt(req.nextUrl.searchParams.get("sessionId") ?? "");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  // Check in-memory job map first (populated by the fire-and-forget POST)
  const job = getJob(sessionId);
  if (job) {
    if (job.status === "processing") return NextResponse.json({ status: "processing" });
    if (job.status === "failed")     return NextResponse.json({ status: "failed", error: job.error });
    if (job.status === "completed")  return NextResponse.json({ status: "completed", result: job.result });
  }

  // Not in memory (server restarted or stale) — fall back to DB
  const [recommendation, agentLogs] = await Promise.all([
    prisma.recommendation.findFirst({
      where: { sessionId, userId },
      orderBy: { createdAt: "desc" },
      select: { content: true, nextActions: true, suggestedRating: true, ratingReason: true },
    }),
    prisma.agentLog.findMany({
      where: { sessionId, userId, agentName: { not: "Nexus" } },
      orderBy: { createdAt: "asc" },
      select: { agentName: true, response: true, latencyMs: true },
    }),
  ]);

  if (!recommendation) {
    return NextResponse.json({ status: "not_found" });
  }

  // Reconstruct AgentResponse structs from stored raw LLM text (agents emit JSON)
  const agentResponses: AgentResponse[] = agentLogs.map((log) => {
    try {
      const fence = log.response.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      const obj   = log.response.match(/(\{[\s\S]*\})/);
      const clean = fence?.[1] ?? obj?.[1] ?? log.response;
      const parsed = JSON.parse(clean) as AgentResponse;
      return { ...parsed, latencyMs: log.latencyMs ?? 0 };
    } catch {
      return {
        agentName: log.agentName,
        model: "",
        domain: "fitness",
        analysis: log.response,
        recommendations: [],
        flags: [],
        nextSession: "",
        latencyMs: log.latencyMs ?? 0,
      };
    }
  });

  return NextResponse.json({
    status: "completed",
    result: {
      recommendation: {
        content: recommendation.content,
        nextActions: recommendation.nextActions as string[],
      },
      agentResponses,
      suggestedRating: recommendation.suggestedRating ?? undefined,
      ratingReason: recommendation.ratingReason ?? undefined,
    },
  });
}
