import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJSON } from "@/lib/agents/parse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      imageBase64: string;
      mimeType: string;
      machine: string;
      tag: string;
    };

    const { imageBase64, mimeType, machine, tag: _tag } = body;

    if (!imageBase64 || !mimeType || !machine) {
      return NextResponse.json({ error: "imageBase64, mimeType, and machine are required" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are analyzing a ${machine} screen photo from a gym. Extract all visible workout metrics. Return ONLY valid JSON, no markdown, no preamble: { "durationMinutes": number|null, "distanceMiles": number|null, "calories": number|null, "avgHeartRate": number|null, "maxHeartRate": number|null, "pace": string|null, "resistance": number|null, "incline": number|null }`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType } },
    ]);

    const text = result.response.text();

    type PhotoResult = {
      durationMinutes: number | null;
      distanceMiles: number | null;
      calories: number | null;
      avgHeartRate: number | null;
      maxHeartRate: number | null;
      pace: string | null;
      resistance: number | null;
      incline: number | null;
    };

    const parsed = extractJSON<PhotoResult>(text, {
      durationMinutes: null,
      distanceMiles: null,
      calories: null,
      avgHeartRate: null,
      maxHeartRate: null,
      pace: null,
      resistance: null,
      incline: null,
    });

    // Normalize to the field names the log form expects
    return NextResponse.json({
      durationMin: parsed.durationMinutes,
      distanceMi: parsed.distanceMiles,
      calories: parsed.calories,
      avgHR: parsed.avgHeartRate,
      maxHR: parsed.maxHeartRate,
    });
  } catch (err) {
    console.error("[POST /api/analyze/cardio-photo]", err);
    return NextResponse.json({ error: "Failed to analyze cardio photo" }, { status: 500 });
  }
}
