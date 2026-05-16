import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    const objectMatch = text.match(/(\{[\s\S]*\})/);
    const clean = fenceMatch?.[1] ?? objectMatch?.[1] ?? text;

    let parsed: {
      durationMinutes: number | null;
      distanceMiles: number | null;
      calories: number | null;
      avgHeartRate: number | null;
      maxHeartRate: number | null;
      pace: string | null;
      resistance: number | null;
      incline: number | null;
    };

    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Gemini response", raw: text },
        { status: 422 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[POST /api/analyze/cardio-photo]", err);
    return NextResponse.json({ error: "Failed to analyze cardio photo" }, { status: 500 });
  }
}
