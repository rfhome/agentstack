import { prisma } from "./prisma";

// Google OAuth / Fit API — replaces legacy Fitbit API (new registrations closed)
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_FIT_AGGREGATE = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate";

export interface FitbitHRZone {
  name: string;
  minutes: number;
  caloriesOut: number;
}

export interface FitbitData {
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  heartPoints: number | null;   // Google's AZM equivalent
  activeMinutes: number | null;
  steps: number | null;
  activityCalories: number | null;
  // kept for formatter compatibility
  heartRateZones: FitbitHRZone[];
  activeZoneMinutes: number | null;
  veryActiveMinutes: number | null;
  fairlyActiveMinutes: number | null;
  fetchedAt: string;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.FITBIT_CLIENT_ID!,
      client_secret: process.env.FITBIT_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    // Google does not re-issue refresh_token on refresh
  };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.wearableConnection.update({
    where: { userId_provider: { userId, provider: "fitbit" } },
    data: { accessToken: data.access_token, expiresAt },
  });
  return data.access_token;
}

async function getValidToken(userId: string): Promise<string> {
  const conn = await prisma.wearableConnection.findUnique({
    where: { userId_provider: { userId, provider: "fitbit" } },
  });
  if (!conn) throw new Error("Fitbit/Google Fit not connected");

  const needsRefresh = conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  if (needsRefresh && conn.refreshToken) {
    return refreshAccessToken(userId, conn.refreshToken);
  }
  return conn.accessToken;
}

function startOfDayMs(dateStr?: string): number {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDayMs(dateStr?: string): number {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export async function fetchFitbitData(userId: string, sessionDate?: string): Promise<FitbitData> {
  const token = await getValidToken(userId);

  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.heart_rate.bpm" },
      { dataTypeName: "com.google.active_minutes" },
      { dataTypeName: "com.google.heart_minutes" },
      { dataTypeName: "com.google.step_count.delta" },
      { dataTypeName: "com.google.calories.expended" },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startOfDayMs(sessionDate),
    endTimeMillis: endOfDayMs(sessionDate),
  };

  const res = await fetch(GOOGLE_FIT_AGGREGATE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Google Fit API returned ${res.status}`);

  const data = (await res.json()) as {
    bucket: {
      dataset: {
        dataSourceId: string;
        point: {
          dataTypeName: string;
          value: { intVal?: number; fpVal?: number }[];
        }[];
      }[];
    }[];
  };

  let avgHeartRate: number | null = null;
  let maxHeartRate: number | null = null;
  let heartPoints: number | null = null;
  let activeMinutes: number | null = null;
  let steps: number | null = null;
  let activityCalories: number | null = null;

  const datasets = data.bucket?.[0]?.dataset ?? [];
  for (const ds of datasets) {
    const point = ds.point?.[0];
    if (!point) continue;

    switch (point.dataTypeName) {
      case "com.google.heart_rate.bpm": {
        // aggregate returns [average, max, min]
        avgHeartRate = point.value[0]?.fpVal ?? null;
        maxHeartRate = point.value[1]?.fpVal ?? null;
        break;
      }
      case "com.google.active_minutes":
        activeMinutes = point.value[0]?.intVal ?? null;
        break;
      case "com.google.heart_minutes":
        heartPoints = point.value[0]?.fpVal ?? null;
        break;
      case "com.google.step_count.delta":
        steps = (steps ?? 0) + (point.value[0]?.intVal ?? 0);
        break;
      case "com.google.calories.expended":
        activityCalories = Math.round(point.value[0]?.fpVal ?? 0) || null;
        break;
    }
  }

  return {
    avgHeartRate: avgHeartRate ? Math.round(avgHeartRate) : null,
    maxHeartRate: maxHeartRate ? Math.round(maxHeartRate) : null,
    heartPoints: heartPoints ? Math.round(heartPoints) : null,
    activeMinutes,
    steps,
    activityCalories,
    // legacy fields — not available from Google Fit
    heartRateZones: [],
    activeZoneMinutes: activeMinutes,
    veryActiveMinutes: null,
    fairlyActiveMinutes: null,
    fetchedAt: new Date().toISOString(),
  };
}

export function formatFitbitForAgents(data: FitbitData): string {
  const lines: string[] = ["## Google Fit / Fitbit Data (today)"];

  if (data.avgHeartRate != null || data.maxHeartRate != null) {
    lines.push(
      `**Heart Rate:** avg ${data.avgHeartRate ?? "n/a"} bpm, max ${data.maxHeartRate ?? "n/a"} bpm`
    );
  } else {
    lines.push("**Heart Rate:** not available");
  }

  if (data.heartPoints != null) {
    lines.push(`**Heart Points (AZM equivalent):** ${data.heartPoints} pts`);
  }
  if (data.activeMinutes != null) {
    lines.push(`**Active Minutes:** ${data.activeMinutes} min`);
  }
  if (data.steps != null) {
    lines.push(`**Steps:** ${data.steps.toLocaleString()}`);
  }
  if (data.activityCalories != null) {
    lines.push(`**Activity Calories:** ${data.activityCalories}`);
  }

  return lines.join("\n");
}
