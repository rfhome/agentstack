import { config } from "dotenv";
config({ path: ".env.local", override: true });

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  console.log("ANTHROPIC_API_KEY present:", !!process.env.ANTHROPIC_API_KEY);
  console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

  try {
    const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const m = await c.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 32,
      messages: [{ role: "user", content: "Say: Pulse online." }],
    });
    console.log("✓ Anthropic:", (m.content[0] as { text: string }).text);
  } catch (e) { console.error("✗ Anthropic:", (e as Error).message); }

  try {
    const g = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = g.getGenerativeModel({ model: "gemini-2.5-flash" });
    const r = await model.generateContent("Say: Lens online.");
    console.log("✓ Gemini:", r.response.text().trim());
  } catch (e) { console.error("✗ Gemini:", (e as Error).message.substring(0, 300)); }
}

main();
