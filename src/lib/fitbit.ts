import { prisma } from "./prisma";

const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const FITBIT_BASE = "https://api.fitbit.com/1/user/-";

export interface FitbitHRZone {
  name: string;
  minutes: number;
  caloriesOut: number;
}

export interface FitbitData {
  heartRateZones: FitbitHRZone[];
  activeZoneMinutes: number | null;
  steps: number | null;
  activityCalories: number | null;
  veryActiveMinutes: number | null;
  fairlyActiveMinutes: number | null;
  fetchedAt: string;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.FITBIT_CLIENT_ID!}:${process.env.FITBIT_CLIENT_SECRET!}`
  ).toString("base64");

  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Fitbit token refresh failed: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.wearableConnection.update({
    where: { userId_provider: { userId, provider: "fitbit" } },
    data: { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt },
  });
  return data.access_token;
}

async function getValidToken(userId: string): Promise<string> {
  const conn = await prisma.wearableConnection.findUnique({
    where: { userId_provider: { userId, provider: "fitbit" } },
  });
  if (!conn) throw new Error("Fitbit not connected");

  const needsRefresh = conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  if (needsRefresh && conn.refreshToken) {
    return refreshAccessToken(userId, conn.refreshToken);
  }
  return conn.accessToken;
}

export async function fetchFitbitData(userId: string): Promise<FitbitData> {
  const token = await getValidToken(userId);

  const [hrRes, actRes] = await Promise.allSettled([
    fetch(`${FITBIT_BASE}/activities/heart/date/today/1d.json`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
    fetch(`${FITBIT_BASE}/activities/date/today.json`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  let heartRateZones: FitbitHRZone[] = [];
  if (hrRes.status === "fulfilled" && hrRes.value.ok) {
    const hrData = (await hrRes.value.json()) as {
      "activities-heart": { value: { heartRateZones: FitbitHRZone[] } }[];
    };
    heartRateZones =
      hrData["activities-heart"]?.[0]?.value?.heartRateZones ?? [];
  }

  let activeZoneMinutes: number | null = null;
  let steps: number | null = null;
  let activityCalories: number | null = null;
  let veryActiveMinutes: number | null = null;
  let fairlyActiveMinutes: number | null = null;

  if (actRes.status === "fulfilled" && actRes.value.ok) {
    const actData = (await actRes.value.json()) as {
      summary: {
        activeZoneMinutes?: number;
        steps?: number;
        activityCalories?: number;
        veryActiveMinutes?: number;
        fairlyActiveMinutes?: number;
      };
    };
    const s = actData.summary ?? {};
    activeZoneMinutes = s.activeZoneMinutes ?? null;
    steps = s.steps ?? null;
    activityCalories = s.activityCalories ?? null;
    veryActiveMinutes = s.veryActiveMinutes ?? null;
    fairlyActiveMinutes = s.fairlyActiveMinutes ?? null;
  }

  return {
    heartRateZones,
    activeZoneMinutes,
    steps,
    activityCalories,
    veryActiveMinutes,
    fairlyActiveMinutes,
    fetchedAt: new Date().toISOString(),
  };
}

export function formatFitbitForAgents(data: FitbitData): string {
  const lines: string[] = ["## Fitbit Data"];

  if (data.heartRateZones.length > 0) {
    lines.push("**Heart Rate Zones (today):**");
    lines.push("| Zone | Minutes | Calories |");
    lines.push("|------|---------|----------|");
    for (const zone of data.heartRateZones) {
      lines.push(`| ${zone.name} | ${zone.minutes} | ${zone.caloriesOut.toFixed(1)} |`);
    }
  } else {
    lines.push("**Heart Rate Zones:** not available");
  }

  if (data.activeZoneMinutes != null) {
    lines.push(`**Active Zone Minutes (AZM):** ${data.activeZoneMinutes} min total`);
  }
  if (data.veryActiveMinutes != null || data.fairlyActiveMinutes != null) {
    lines.push(
      `  Vigorous: ${data.veryActiveMinutes ?? "n/a"} min, Moderate: ${data.fairlyActiveMinutes ?? "n/a"} min`
    );
  }
  if (data.steps != null) {
    lines.push(`**Steps:** ${data.steps.toLocaleString()}`);
  }
  if (data.activityCalories != null) {
    lines.push(`**Activity Calories:** ${data.activityCalories}`);
  }

  return lines.join("\n");
}
