import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJSON } from "@/lib/agents/parse";

// Analyze a wearable screenshot and return metrics — does NOT save to the DB.
// Used by LogActivityModal to pre-fill fields before the user confirms.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageData, imageMediaType, activityType } = await req.json() as {
    imageData: string;
    imageMediaType: string;
    activityType?: string;
  };

  if (!imageData || !imageMediaType) {
    return NextResponse.json({ error: "imageData and imageMediaType are required" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are analyzing a wearable or fitness app screenshot showing a ${activityType ?? "workout"} summary. Extract all visible metrics. Return ONLY valid JSON, no markdown: { "durationMinutes": number|null, "distanceMiles": number|null, "avgHeartRate": number|null, "maxHeartRate": number|null, "calories": number|null }`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: imageMediaType } },
    ]);

    const metrics = extractJSON<{
      durationMinutes: number | null;
      distanceMiles: number | null;
      avgHeartRate: number | null;
      maxHeartRate: number | null;
      calories: number | null;
    }>(result.response.text(), {
      durationMinutes: null, distanceMiles: null,
      avgHeartRate: null, maxHeartRate: null, calories: null,
    });

    return NextResponse.json(metrics);
  } catch {
    return NextResponse.json({
      durationMinutes: null, distanceMiles: null,
      avgHeartRate: null, maxHeartRate: null, calories: null,
    });
  }
}
