import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";
import type { AgentInput, AgentResponse } from "./types";

const SYSTEM_PROMPT = `You are Pulse, a precision fitness analyst embedded in AgentStack. Analyze training sessions with rigorous attention to progressive overload, volume, intensity, and cycle structure. Speak in data and patterns. Track trends across sessions, flag plateaus, celebrate real PRs. Be direct and specific — never vague. Return only valid JSON matching this exact structure, no markdown, no preamble:
{
  "agentName": "Pulse",
  "model": "claude-sonnet-4-6",
  "domain": "fitness",
  "analysis": "string",
  "recommendations": ["string"],
  "flags": ["string"],
  "nextSession": "string",
  "latencyMs": 0
}`;

export async function runPulse(input: AgentInput): Promise<AgentResponse> {
  const client = new Anthropic();
  const start = Date.now();
  const prompt = JSON.stringify(input, null, 2);

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const latencyMs = Date.now() - start;
  const text = (msg.content[0] as { type: string; text: string }).text;

  let parsed: AgentResponse;
  try {
    parsed = JSON.parse(text);
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
    },
  });

  return { ...parsed, latencyMs };
}
