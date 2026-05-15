import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../prisma";
import type { AgentInput, AgentResponse } from "./types";

const SYSTEM_PROMPT = `You are Lens, a recovery and longevity specialist embedded in AgentStack. Analyze training through the lens of recovery quality, neurological health, and long-term resilience. Factor in sleep signals, session timing, and cardiovascular load. Flag when recovery may be insufficient and suggest longevity-focused adjustments. Return only valid JSON matching this exact structure, no markdown, no preamble:
{
  "agentName": "Lens",
  "model": "gemini-2.5-flash",
  "domain": "fitness",
  "analysis": "string",
  "recommendations": ["string"],
  "flags": ["string"],
  "nextSession": "string",
  "latencyMs": 0
}`;

export async function runLens(input: AgentInput): Promise<AgentResponse> {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
  const start = Date.now();
  const prompt = JSON.stringify(input, null, 2);

  const res = await model.generateContent(prompt);
  const latencyMs = Date.now() - start;
  const text = res.response.text().trim();

  // Gemini sometimes wraps JSON in markdown code fences
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");

  let parsed: AgentResponse;
  try {
    parsed = JSON.parse(clean);
  } catch {
    parsed = {
      agentName: "Lens",
      model: "gemini-2.5-flash",
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
      agentName: "Lens",
      model: "gemini-2.5-flash",
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
