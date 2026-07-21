import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../prisma";
import { wrapAgentInput, SECURITY_CANARY } from "../security";
import type { AgentInput, AgentResponse } from "./types";

const SYSTEM_PROMPT = `You are Lens, a recovery and longevity specialist embedded in AgentStack. Analyze training through the lens of recovery quality, neurological health, and long-term resilience. Factor in sleep signals, session timing, and cardiovascular load. When Oura Ring data is present in the input (under "ouraContext"), treat it as the primary recovery signal — readiness score, HRV, sleep score, and temperature deviation should directly influence your analysis and flags. Flag when recovery may be insufficient and suggest longevity-focused adjustments. When Fitbit data is present (under "fitbitContext"), use it alongside Oura data to give a complete recovery + effort picture: Oura tells you how ready the athlete was going in; Fitbit tells you how hard they actually worked. When Apple Health data is present (under "appleHealthContext"), use it as an additional recovery signal — pay particular attention to HRV trends, resting HR, and sleep hours as indicators of systemic recovery load. If "preWorkoutContext" is present in the input, the athlete shared a note BEFORE the session (e.g. recovering from illness, managing fatigue). Factor this into recovery analysis — it directly explains why session volume or intensity may have been reduced, and should inform your longevity and recovery flags. Return only valid JSON matching this exact structure, no markdown, no preamble:
{
  "agentName": "Lens",
  "model": "gemini-2.5-flash",
  "domain": "fitness",
  "analysis": "string",
  "recommendations": ["string"],
  "flags": ["string"],
  "nextSession": "string",
  "latencyMs": 0
}${SECURITY_CANARY}`;

export async function runLens(input: AgentInput): Promise<AgentResponse> {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
  const start = Date.now();

  // Strip raw image data before serializing — base64 blobs in JSON text would
  // blow past Gemini's token limit and silently kill the agent.
  // Wearable context is already extracted into ouraContext / fitbitContext strings.
  const { images: _images, ...inputWithoutImages } = input;
  const prompt = wrapAgentInput(JSON.stringify(inputWithoutImages, null, 2));

  // Pass wearable screenshots as proper Gemini inlineData parts (not embedded text)
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: Part[] = [{ text: prompt }];
  if (input.images?.length) {
    for (const img of input.images) {
      parts.push({ inlineData: { mimeType: img.mediaType, data: img.data } });
    }
  }

  const res = await model.generateContent(parts);
  const latencyMs = Date.now() - start;
  const text = res.response.text().trim();

  const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  const objectMatch = text.match(/(\{[\s\S]*\})/);
  const clean = fenceMatch?.[1] ?? objectMatch?.[1] ?? text;

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
