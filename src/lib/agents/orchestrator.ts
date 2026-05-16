import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";
import { runPulse } from "./pulse";
import { runForge } from "./forge";
import { runLens } from "./lens";
import type { AgentInput, AgentResponse, OrchestratorResult } from "./types";

const NEXUS_SYSTEM_PROMPT = `You are Nexus, the master orchestrator of AgentStack. You receive analysis from three specialized agents — Pulse (fitness analyst), Forge (program architect), and Lens (recovery & longevity specialist) — and synthesize their findings into a single unified recommendation.

Resolve conflicts between agents, weigh each perspective appropriately, and deliver one clear, actionable recommendation. Be direct. Prioritize what matters most for today and the next session.

Return only valid JSON with this exact structure, no markdown, no preamble:
{
  "content": "string — 2-4 sentence synthesis paragraph",
  "nextActions": ["string", "string", "string"]
}`;

export async function runOrchestrator(input: AgentInput): Promise<OrchestratorResult> {
  // Fan out to all 3 agents in parallel (Lens may fail if Gemini billing not set up)
  const results = await Promise.allSettled([
    runPulse(input),
    runForge(input),
    runLens(input),
  ]);

  const agentResponses: AgentResponse[] = results
    .filter((r): r is PromiseFulfilledResult<AgentResponse> => r.status === "fulfilled")
    .map((r) => r.value);

  if (agentResponses.length === 0) {
    throw new Error("All agents failed — cannot synthesize.");
  }

  // Send all agent responses to Nexus for synthesis
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const start = Date.now();
  const nexusPrompt = JSON.stringify({ agentResponses, sessionContext: input.sessionData }, null, 2);

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: NEXUS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: nexusPrompt }],
  });

  const latencyMs = Date.now() - start;
  const text = (msg.content[0] as { type: string; text: string }).text;
  const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  const objectMatch = text.match(/(\{[\s\S]*\})/);
  const clean = fenceMatch?.[1] ?? objectMatch?.[1] ?? text;

  let synthesis: { content: string; nextActions: string[] };
  try {
    synthesis = JSON.parse(clean);
  } catch {
    synthesis = { content: text, nextActions: [] };
  }

  await prisma.agentLog.create({
    data: {
      agentName: "Nexus",
      model: "claude-sonnet-4-6",
      domain: "fitness",
      prompt: nexusPrompt,
      response: text,
      latencyMs,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
    },
  });

  const recommendation = await prisma.recommendation.create({
    data: {
      domain: "fitness",
      content: synthesis.content,
      nextActions: synthesis.nextActions,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
    },
  });

  void recommendation;

  return {
    recommendation: synthesis,
    agentResponses,
  };
}
