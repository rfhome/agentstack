import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";
import { runPulse } from "./pulse";
import { runForge } from "./forge";
import { runLens } from "./lens";
import { extractJSON, isValidRating } from "./parse";
import { wrapNexusInput, detectOutputLeak, SECURITY_CANARY } from "../security";
import type { AgentInput, AgentResponse, OrchestratorResult } from "./types";

const NEXUS_SYSTEM_PROMPT = `You are Nexus, the master orchestrator of AgentStack. You receive analysis from three specialized agents — Pulse (fitness analyst), Forge (program architect), and Lens (recovery & longevity specialist) — and synthesize their findings into a single unified recommendation.

Resolve conflicts between agents, weigh each perspective appropriately, and deliver one clear, actionable recommendation. Be direct. Prioritize what matters most for today and the next session.

Also suggest a session rating based on the overall quality of the session:
- A: Excellent — strong performance, good HR response, progressed load or volume, well recovered
- B: Solid — adequate performance, minor flags (slightly elevated HR, small regression, minor fatigue)
- C: Tough — significant fatigue, regression, poor recovery, or injury flags

Return only valid JSON with this exact structure, no markdown, no preamble:
{
  "content": "string — 2-4 sentence synthesis paragraph",
  "nextActions": ["string", "string", "string"],
  "suggestedRating": "A" | "B" | "C",
  "ratingReason": "string — one sentence explaining the rating"
}${SECURITY_CANARY}`;

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
  const nexusPrompt = wrapNexusInput(JSON.stringify({ agentResponses, sessionContext: input.sessionData }, null, 2));

  type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } };

  const nexusContent: ContentBlock[] = [{ type: "text", text: nexusPrompt }];
  if (input.images?.length) {
    nexusContent.push({ type: "text", text: "\nWorkout screenshots for additional context:" });
    for (const img of input.images) {
      nexusContent.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType as ImageMediaType, data: img.data },
      });
    }
  }

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: NEXUS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: nexusContent }],
  });

  const latencyMs = Date.now() - start;
  const text = (msg.content[0] as { type: string; text: string }).text;

  // Scan output for signs of system-internal leakage before storing or returning
  const leakDetected = detectOutputLeak(text);

  const synthesis = extractJSON<{
    content: string;
    nextActions: string[];
    suggestedRating?: string;
    ratingReason?: string;
  }>(text, { content: text, nextActions: [] });

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

  // If leak detected, log a warning but surface a safe placeholder to the user
  const safeContent = leakDetected
    ? "Analysis complete. Review individual agent outputs for details."
    : synthesis.content;

  if (leakDetected) {
    console.warn("[Nexus] Output leak pattern detected — redacted from recommendation", {
      userId: input.userId,
      sessionId: input.sessionId,
    });
  }

  const suggestedRating = isValidRating(synthesis.suggestedRating)
    ? synthesis.suggestedRating
    : undefined;

  await prisma.recommendation.create({
    data: {
      domain: "fitness",
      content: safeContent,
      nextActions: synthesis.nextActions,
      suggestedRating: suggestedRating ?? null,
      ratingReason: synthesis.ratingReason ?? null,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
    },
  });

  return {
    recommendation: { content: safeContent, nextActions: synthesis.nextActions },
    agentResponses,
    suggestedRating,
    ratingReason: synthesis.ratingReason,
  };
}
