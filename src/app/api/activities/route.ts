import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJSON } from "@/lib/agents/parse";

type PhotoMetrics = {
  durationMinutes: number | null;
  distanceMiles: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
};

async function analyzeActivityPhoto(imageBase64: string, mimeType: string, activityType: string): Promise<PhotoMetrics> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are analyzing a wearable or fitness app screenshot showing a ${activityType} workout summary. Extract all visible metrics. Return ONLY valid JSON, no markdown: { "durationMinutes": number|null, "distanceMiles": number|null, "avgHeartRate": number|null, "maxHeartRate": number|null, "calories": number|null }`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageBase64, mimeType } },
  ]);

  return extractJSON<PhotoMetrics>(result.response.text(), {
    durationMinutes: null,
    distanceMiles: null,
    avgHeartRate: null,
    maxHeartRate: null,
    calories: null,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const activities = await withRLS(userId, (db) =>
    db.activity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 20,
    })
  );

  return NextResponse.json(activities.map((a) => ({
    ...a,
    date: a.date.toISOString(),
    // Don't send image data in list view — only used at log time
    imageData: undefined,
    imageMediaType: undefined,
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json() as {
    type: string;
    date: string;
    durationMin?: number | null;
    distanceMi?: number | null;
    avgHR?: number | null;
    maxHR?: number | null;
    calories?: number | null;
    notes?: string | null;
    imageData?: string | null;
    imageMediaType?: string | null;
  };

  if (!body.type?.trim() || !body.date) {
    return NextResponse.json({ error: "type and date are required" }, { status: 400 });
  }

  // If an image was uploaded and no metrics provided, analyze it with Gemini
  let durationMin = body.durationMin ?? null;
  let distanceMi = body.distanceMi ?? null;
  let avgHR = body.avgHR ?? null;
  let maxHR = body.maxHR ?? null;
  let calories = body.calories ?? null;

  if (body.imageData && body.imageMediaType && !durationMin && !avgHR) {
    try {
      const metrics = await analyzeActivityPhoto(body.imageData, body.imageMediaType, body.type);
      durationMin = metrics.durationMinutes ?? durationMin;
      distanceMi  = metrics.distanceMiles  ?? distanceMi;
      avgHR       = metrics.avgHeartRate   ?? avgHR;
      maxHR       = metrics.maxHeartRate   ?? maxHR;
      calories    = metrics.calories       ?? calories;
    } catch {
      // Photo analysis is best-effort — proceed without it
    }
  }

  const activity = await withRLS(userId, (db) =>
    db.activity.create({
      data: {
        userId,
        type: body.type.trim(),
        date: new Date(body.date),
        durationMin,
        distanceMi,
        avgHR,
        maxHR,
        calories,
        notes: body.notes?.trim() || null,
        imageData: body.imageData ?? null,
        imageMediaType: body.imageMediaType ?? null,
      },
    })
  );

  return NextResponse.json({ ...activity, date: activity.date.toISOString() }, { status: 201 });
}
