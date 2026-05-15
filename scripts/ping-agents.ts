import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load .env.local manually for this script
import { config } from "dotenv";
config({ path: ".env.local", override: true });

async function pingAnthropic() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const start = Date.now();
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 64,
    messages: [{ role: "user", content: "Reply with: Pulse online." }],
  });
  const text = (msg.content[0] as { type: string; text: string }).text;
  console.log(`✓ Anthropic (${Date.now() - start}ms): ${text}`);
}

async function pingOpenAI() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const start = Date.now();
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 64,
    messages: [{ role: "user", content: "Reply with: Forge online." }],
  });
  console.log(`✓ OpenAI (${Date.now() - start}ms): ${res.choices[0].message.content}`);
}

async function pingGemini() {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
  const start = Date.now();
  const res = await model.generateContent("Reply with: Lens online.");
  const text = res.response.text();
  console.log(`✓ Gemini (${Date.now() - start}ms): ${text.trim()}`);
}

async function main() {
  console.log("Pinging all agents...\n");
  const results = await Promise.allSettled([pingAnthropic(), pingOpenAI(), pingGemini()]);
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length === 0) {
    console.log("\nAll agents reachable.");
  } else {
    console.log(`\n${failures.length} agent(s) failed — see errors above.`);
  }
}

main().catch((err) => {
  console.error("Ping failed:", err.message);
  process.exit(1);
});
