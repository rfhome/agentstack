import { prisma } from "./prisma";

const OURA_BASE = "https://api.ouraring.com/v2/usercollection";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";

export interface OuraReadiness {
  day: string;   // Oura API v2 uses "day" (YYYY-MM-DD), not "date"
  date?: string; // legacy alias — keep for formatOuraForLens compatibility
  score: number | null;
  temperature_deviation: number | null;
  contributors: {
    sleep_balance: number | null;
    activity_balance: number | null;
    body_temperature: number | null;
    hrv_balance: number | null;
    recovery_index: number | null;
    resting_heart_rate: number | null;
  };
}

export interface OuraSleep {
  day: string;   // Oura API v2 uses "day" (YYYY-MM-DD), not "date"
  date?: string; // legacy alias — keep for formatOuraForLens compatibility
  score: number | null;
  average_hrv: number | null;
  average_heart_rate: number | null;
  total_sleep_duration: number | null;
  efficiency: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
}

export interface OuraActivity {
  day: string;   // Oura API v2 uses "day" (YYYY-MM-DD), not "date"
  date?: string; // legacy alias
  score: number | null;
  active_calories: number | null;
  total_calories: number | null;
  steps: number | null;
  equivalent_walking_distance: number | null;
  high_activity_time: number | null;   // seconds
  medium_activity_time: number | null; // seconds
  low_activity_time: number | null;    // seconds
  resting_time: number | null;         // seconds
  sedentary_time: number | null;       // seconds
}

export interface OuraData {
  readiness: OuraReadiness | null;
  sleep: OuraSleep | null;
  activity: OuraActivity | null;
  fetchedAt: string;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.wearableConnection.update({
    where: { userId_provider: { userId, provider: "oura" } },
    data: { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt },
  });
  return data.access_token;
}

async function getValidToken(userId: string): Promise<string> {
  const conn = await prisma.wearableConnection.findUnique({
    where: { userId_provider: { userId, provider: "oura" } },
  });
  if (!conn) throw new Error("Oura not connected");

  const needsRefresh = conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  if (needsRefresh && conn.refreshToken) {
    return refreshAccessToken(userId, conn.refreshToken);
  }
  return conn.accessToken;
}

async function ouraGet<T>(path: string, token: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${OURA_BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Oura API ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

function dateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() - 1);
  return dateString(d);
}

/** Fetch readiness + sleep only (for save time — morning context). */
export async function fetchOuraRecovery(userId: string, sessionDate: string): Promise<Pick<OuraData, "readiness" | "sleep">> {
  const token = await getValidToken(userId);
  // Oura's readiness/sleep scores for a given date reflect the night before —
  // so we fetch the session date and the day before to get whichever is most recent.
  const start = prevDay(sessionDate);
  const end = sessionDate;

  const [readinessRes, sleepRes] = await Promise.allSettled([
    ouraGet<{ data: OuraReadiness[] }>("daily_readiness", token, { start_date: start, end_date: end }),
    ouraGet<{ data: OuraSleep[] }>("daily_sleep", token, { start_date: start, end_date: end }),
  ]);

  const readiness =
    readinessRes.status === "fulfilled" && readinessRes.value.data.length > 0
      ? readinessRes.value.data[readinessRes.value.data.length - 1]
      : null;

  const sleep =
    sleepRes.status === "fulfilled" && sleepRes.value.data.length > 0
      ? sleepRes.value.data[sleepRes.value.data.length - 1]
      : null;

  return { readiness, sleep };
}

/** Fetch all Oura data for a date (for analyze time — full day picture). */
export async function fetchOuraData(userId: string, sessionDate?: string): Promise<OuraData> {
  const token = await getValidToken(userId);
  const target = sessionDate ?? dateString(new Date());
  const start = prevDay(target);
  const end = target;

  const [readinessRes, sleepRes, activityRes] = await Promise.allSettled([
    ouraGet<{ data: OuraReadiness[] }>("daily_readiness", token, { start_date: start, end_date: end }),
    ouraGet<{ data: OuraSleep[] }>("daily_sleep", token, { start_date: start, end_date: end }),
    ouraGet<{ data: OuraActivity[] }>("daily_activity", token, { start_date: target, end_date: target }),
  ]);

  const readiness =
    readinessRes.status === "fulfilled" && readinessRes.value.data.length > 0
      ? readinessRes.value.data[readinessRes.value.data.length - 1]
      : null;

  const sleep =
    sleepRes.status === "fulfilled" && sleepRes.value.data.length > 0
      ? sleepRes.value.data[sleepRes.value.data.length - 1]
      : null;

  const activity =
    activityRes.status === "fulfilled" && activityRes.value.data.length > 0
      ? activityRes.value.data[0]
      : null;

  return { readiness, sleep, activity, fetchedAt: new Date().toISOString() };
}

export interface OuraTrendPoint {
  date: string;
  readiness: number | null;
  sleep: number | null;
  hrv: number | null;
  restingHR: number | null;
}

/** Fetch daily readiness + sleep for the last `days` days (default 28). */
export async function fetchOuraTrend(userId: string, days = 28): Promise<OuraTrendPoint[]> {
  const token = await getValidToken(userId);
  const end = dateString(new Date());
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = dateString(startDate);

  const [readinessRes, sleepRes] = await Promise.allSettled([
    ouraGet<{ data: OuraReadiness[] }>("daily_readiness", token, { start_date: start, end_date: end }),
    ouraGet<{ data: OuraSleep[] }>("daily_sleep", token, { start_date: start, end_date: end }),
  ]);

  const readinessByDate = new Map<string, OuraReadiness>();
  if (readinessRes.status === "fulfilled") {
    // Oura API v2 uses "day" field (YYYY-MM-DD); fall back to "date" for safety
    for (const r of readinessRes.value.data) {
      const key = r.day ?? r.date;
      if (key) readinessByDate.set(key, r);
    }
  }

  const sleepByDate = new Map<string, OuraSleep>();
  if (sleepRes.status === "fulfilled") {
    for (const s of sleepRes.value.data) {
      const key = s.day ?? s.date;
      if (key) sleepByDate.set(key, s);
    }
  }

  // Build a point for every day in range that has at least one data source
  const allDates = new Set([...readinessByDate.keys(), ...sleepByDate.keys()]);
  return Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      readiness: readinessByDate.get(date)?.score ?? null,
      sleep: sleepByDate.get(date)?.score ?? null,
      hrv: sleepByDate.get(date)?.average_hrv ?? null,
      restingHR: sleepByDate.get(date)?.average_heart_rate ?? null,
    }));
}

export function formatOuraForLens(data: OuraData): string {
  const lines: string[] = ["## Oura Ring Data"];

  if (data.readiness) {
    const r = data.readiness;
    lines.push(`**Readiness (${r.day ?? r.date}):** ${r.score ?? "n/a"}/100`);
    if (r.temperature_deviation != null) {
      lines.push(`  Temperature deviation: ${r.temperature_deviation > 0 ? "+" : ""}${r.temperature_deviation.toFixed(2)}°C`);
    }
    if (r.contributors) {
      const c = r.contributors;
      lines.push(`  Contributors — HRV balance: ${c.hrv_balance ?? "n/a"}, Sleep balance: ${c.sleep_balance ?? "n/a"}, Activity balance: ${c.activity_balance ?? "n/a"}, RHR: ${c.resting_heart_rate ?? "n/a"}`);
    }
  } else {
    lines.push("**Readiness:** not available");
  }

  if (data.sleep) {
    const s = data.sleep;
    const hrs = s.total_sleep_duration != null ? (s.total_sleep_duration / 3600).toFixed(1) : "n/a";
    lines.push(`**Sleep (${s.day ?? s.date}):** score ${s.score ?? "n/a"}/100, ${hrs}h total`);
    lines.push(`  HRV: ${s.average_hrv ?? "n/a"} ms, Resting HR: ${s.average_heart_rate ?? "n/a"} bpm, Efficiency: ${s.efficiency ?? "n/a"}%`);
    if (s.deep_sleep_duration != null) {
      lines.push(`  Deep: ${(s.deep_sleep_duration / 3600).toFixed(1)}h, REM: ${s.rem_sleep_duration != null ? (s.rem_sleep_duration / 3600).toFixed(1) : "n/a"}h`);
    }
  } else {
    lines.push("**Sleep:** not available");
  }

  if (data.activity) {
    const a = data.activity;
    const highMin = a.high_activity_time != null ? Math.round(a.high_activity_time / 60) : null;
    const medMin = a.medium_activity_time != null ? Math.round(a.medium_activity_time / 60) : null;
    lines.push(`**Activity (${a.date}):** score ${a.score ?? "n/a"}/100`);
    lines.push(`  Steps: ${a.steps?.toLocaleString() ?? "n/a"}, Active calories: ${a.active_calories ?? "n/a"}`);
    if (highMin != null || medMin != null) {
      lines.push(`  High intensity: ${highMin ?? "n/a"} min, Medium: ${medMin ?? "n/a"} min`);
    }
  }

  return lines.join("\n");
}
