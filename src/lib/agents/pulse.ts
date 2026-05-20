import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";
import type { AgentInput, AgentResponse } from "./types";

const SYSTEM_PROMPT = `You are Pulse, a precision fitness analyst embedded in AgentStack. Analyze training sessions with rigorous attention to progressive overload, volume, intensity, and cycle structure. Speak in data and patterns. Track trends across sessions, flag plateaus, celebrate real PRs. Be direct and specific — never vague.

When analyzing, always address:
- Per-exercise performance: best lift, worst lift, any PRs hit or missed — use the "weights" field (per-set weights string, e.g. "95,95,100") as the source of truth for what was actually lifted
- HR zone breakdown: classify the session by moderate vs vigorous zone minutes (AZM), flag if cardio load was unusually high or low
- Energy/effort: infer from rating, notes, and HR whether the athlete was under/over-recovered

When Fitbit data is present (under "fitbitContext"), use the HR zone breakdown (Fat Burn, Cardio, Peak minutes) to classify the session intensity and directly answer: how many minutes were spent in each zone, what was the dominant zone, and whether the cardio load was appropriate for the training goal.
- Progressive overload: compare each exercise to recent history, call out what moved and what stalled
- Cardio activities: if cardioActivities array is present, break down each entry by tag (warmup/finisher/standalone), machine, duration, and HR — factor warmup HR into session context and finisher load into total cardiovascular demand

CRITICAL: Your entire response must be a single valid JSON object. Do not write any text before or after it. Do not nest JSON inside string fields. The "analysis" field must be a plain string, not an object. Use this exact structure:
{
  "agentName": "Pulse",
  "model": "claude-sonnet-4-6",
  "domain": "fitness",
  "analysis": "your analysis as a plain string",
  "recommendations": ["string", "string"],
  "flags": ["string"],
  "nextSession": "specific next session guidance as a plain string",
  "latencyMs": 0
}`;

export async function runPulse(input: AgentInput): Promise<AgentResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const start = Date.now();

  // Exclude images from the JSON text prompt (passed separately as vision blocks)
  const { images, ...inputWithoutImages } = input;
  const prompt = JSON.stringify(inputWithoutImages, null, 2);

  type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } };

  const content: ContentBlock[] = [{ type: "text", text: prompt }];
  if (images?.length) {
    content.push({ type: "text", text: "\nThe following workout screenshots are attached. Use them to extract HR zone data, machine summaries, and any metrics visible in the images:" });
    for (const img of images) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType as ImageMediaType, data: img.data },
      });
    }
  }

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const latencyMs = Date.now() - start;
  const text = (msg.content[0] as { type: string; text: string }).text;

  const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  const objectMatch = text.match(/(\{[\s\S]*\})/);
  const clean = fenceMatch?.[1] ?? objectMatch?.[1] ?? text;

  let parsed: AgentResponse;
  try {
    parsed = JSON.parse(clean);
  } catch {
    parsed = {
      agentName: "Pulse",
      model: "claude-sonnet-4-6",
      domain: "fitness",
      analysis: text,
      recommendations: [],
      flags: ["JSON parse failed — raw response stored"],
      nextSession: "",
      latencyMs,
    };
  }

  await prisma.agentLog.create({
    data: {
      agentName: "Pulse",
      model: "claude-sonnet-4-6",
      domain: "fitness",
      prompt,
      response: text,
      latencyMs,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
    },
  });

  return { ...parsed, latencyMs };
}
