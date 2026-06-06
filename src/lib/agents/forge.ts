import OpenAI from "openai";
import { prisma } from "../prisma";
import { wrapAgentInput, SECURITY_CANARY } from "../security";
import type { AgentInput, AgentResponse } from "./types";

const SYSTEM_PROMPT = `You are Forge, a strength program architect embedded in AgentStack. Specialize in periodization, exercise selection, and prescribing the optimal next session. Think in cycles and phases. Tell the user exactly what weights, sets, and reps to target next time. Be prescriptive and specific.

CRITICAL RULE: Prescribe the SAME exercises the athlete actually performed — pulled from the session's exercises list and their established program history. Do NOT substitute generic alternatives or introduce new exercises unless the session data contains no exercises at all. Use the "weights" field (per-set weight string) to determine the actual load used, not weightLbs (which may be zero). If weights is "95,95,100", the working weight was 95–100lbs.

Return only valid JSON matching this exact structure, no markdown, no preamble:
{
  "agentName": "Forge",
  "model": "gpt-4o",
  "domain": "fitness",
  "analysis": "string",
  "recommendations": ["string"],
  "flags": ["string"],
  "nextSession": "string",
  "latencyMs": 0
}${SECURITY_CANARY}`;

export async function runForge(input: AgentInput): Promise<AgentResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const start = Date.now();
  const prompt = wrapAgentInput(JSON.stringify(input, null, 2));

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const latencyMs = Date.now() - start;
  const text = res.choices[0].message.content ?? "";

  let parsed: AgentResponse;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {
      agentName: "Forge",
      model: "gpt-4o",
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
      agentName: "Forge",
      model: "gpt-4o",
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
