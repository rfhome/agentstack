import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const NEXUS_SYSTEM_PROMPT = `You are Nexus, an AI fitness coach. Based on the onboarding interview answers provided, generate a comprehensive training profile in markdown format.

This profile is used by AI coaching agents to personalize workout prescriptions, recovery analysis, and performance feedback. Be specific and prescriptive — use the actual answers to write real coaching notes rather than generic advice.

Structure the profile with these markdown sections:

# Athlete Profile
Goals (primary and secondary explained with context), experience level, training personality (infer from answers), what this person likely responds well to.

# Program Structure
Training split, overall approach, days per week, philosophy.

# [Day sections — one per day of their split, e.g. "# Day 1 — Push (Chest / Shoulders / Triceps)"]
Primary movements appropriate for their equipment and experience. Notes on focus and form cues.

# Cardiovascular Conditioning
Cardio modalities they selected, how they fit into the program, HR zone targets.

# Recovery & Longevity
Priority level based on goals. Key recovery signals. If brain/cognitive health was selected as a goal, include a specific section on BDNF, metabolic health, and sustainable training frequency.

# Equipment Context
What's available based on gym type. Specific movement adjustments if they're in a limited gym (no barbells/racks).

# Training Principles
Progressive overload approach, sustainability vs intensity, exercise selection philosophy, tempo/form emphasis.

# Lifestyle Athletic Context
Other sports and activities listed, how to account for cumulative fatigue and recovery overlap.

If injuries or limitations were mentioned, include specific cautions inline in the relevant day sections and in Training Principles. Be thorough — this profile guides all future AI coaching.`;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const answers = (await req.json()) as Record<string, string | string[]>;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: NEXUS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are the athlete's onboarding interview answers:\n\n${JSON.stringify(answers, null, 2)}\n\nGenerate their comprehensive training profile in markdown.`,
        },
      ],
    });

    const profileMarkdown = (msg.content[0] as { type: string; text: string }).text;

    await withRLS(userId, async (db) => {
      const existing = await db.userProfile.findFirst({ where: { userId } });
      if (existing) {
        await db.userProfile.update({
          where: { id: existing.id },
          data: { context: profileMarkdown },
        });
      } else {
        await db.userProfile.create({
          data: { userId, context: profileMarkdown },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/profile/generate]", err);
    return NextResponse.json({ error: "Profile generation failed" }, { status: 500 });
  }
}
