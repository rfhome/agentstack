/**
 * POST /api/wearables/apple-health/ingest?token=<webhook_token>
 *
 * Receives Health Auto Export payloads. No user session required — authenticated
 * via the per-user token embedded in the URL. Health Auto Export sends this
 * automatically on each sync.
 *
 * Stores:
 *   - Daily summaries (HRV, resting HR, sleep, calories, steps) → AppleHealthDay
 *   - Workouts (running, cycling, etc.)                          → Activity
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseHealthExport } from "@/lib/apple-health";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  // Look up the user by webhook token
  const conn = await prisma.wearableConnection.findFirst({
    where: { provider: "apple_health", accessToken: token },
    select: { userId: true },
  });
  if (!conn) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const userId = conn.userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Temporary debug — log metric names and first entry of each
  const metrics = (body as { data?: { metrics?: { name: string; data: unknown[] }[] } })?.data?.metrics ?? [];
  console.log("[apple-health/ingest] metric names:", metrics.map((m) => m.name));
  console.log("[apple-health/ingest] first entries:", JSON.stringify(metrics.map((m) => ({ name: m.name, first: m.data?.[0] }))));

  const { days, workouts } = parseHealthExport(body);
  console.log("[apple-health/ingest] parsed:", { daysCount: days.length, workoutsCount: workouts.length });

  // Upsert daily summaries
  for (const day of days) {
    await prisma.appleHealthDay.upsert({
      where: { userId_date: { userId, date: day.date } },
      update: {
        ...(day.hrv        != null && { hrv:        day.hrv }),
        ...(day.restingHR  != null && { restingHR:  day.restingHR }),
        ...(day.sleepHours != null && { sleepHours: day.sleepHours }),
        ...(day.activeKcal != null && { activeKcal: day.activeKcal }),
        ...(day.steps      != null && { steps:      day.steps }),
      },
      create: {
        userId,
        date: day.date,
        hrv:        day.hrv        ?? null,
        restingHR:  day.restingHR  ?? null,
        sleepHours: day.sleepHours ?? null,
        activeKcal: day.activeKcal ?? null,
        steps:      day.steps      ?? null,
      },
    });
  }

  // Insert workouts as Activity records (skip duplicates by checking type+date)
  let workoutsAdded = 0;
  for (const w of workouts) {
    const dateObj = new Date(w.date + "T12:00:00.000Z");
    const existing = await prisma.activity.findFirst({
      where: { userId, type: w.type, date: dateObj },
    });
    if (!existing) {
      await prisma.activity.create({
        data: {
          userId,
          type: w.type,
          date: dateObj,
          durationMin: w.durationMin,
          distanceMi:  w.distanceMi,
          avgHR:       w.avgHR,
          maxHR:       w.maxHR,
          calories:    w.calories,
          notes:       "via Apple Health",
        },
      });
      workoutsAdded++;
    }
  }

  return NextResponse.json({
    ok: true,
    daysUpserted: days.length,
    workoutsAdded,
  });
}
