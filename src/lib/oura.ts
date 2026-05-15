import { prisma } from "./prisma";

const OURA_BASE = "https://api.ouraring.com/v2/usercollection";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";

export interface OuraReadiness {
  date: string;
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
  date: string;
  score: number | null;
  average_hrv: number | null;
  average_heart_rate: number | null;
  total_sleep_duration: number | null;
  efficiency: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
}

export interface OuraData {
  readiness: OuraReadiness | null;
  sleep: OuraSleep | null;
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

  // Refresh if expired or expiring within 5 min
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

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export async function fetchOuraData(userId: string): Promise<OuraData> {
  const token = await getValidToken(userId);
  const start = yesterday();
  const end = today();

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

  return { readiness, sleep, fetchedAt: new Date().toISOString() };
}

export function formatOuraForLens(data: OuraData): string {
  const lines: string[] = ["## Oura Ring Data"];

  if (data.readiness) {
    const r = data.readiness;
    lines.push(`**Readiness (${r.date}):** ${r.score ?? "n/a"}/100`);
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
    lines.push(`**Sleep (${s.date}):** score ${s.score ?? "n/a"}/100, ${hrs}h total`);
    lines.push(`  HRV: ${s.average_hrv ?? "n/a"} ms, Resting HR: ${s.average_heart_rate ?? "n/a"} bpm, Efficiency: ${s.efficiency ?? "n/a"}%`);
    if (s.deep_sleep_duration != null) {
      lines.push(`  Deep: ${(s.deep_sleep_duration / 3600).toFixed(1)}h, REM: ${s.rem_sleep_duration != null ? (s.rem_sleep_duration / 3600).toFixed(1) : "n/a"}h`);
    }
  } else {
    lines.push("**Sleep:** not available");
  }

  return lines.join("\n");
}
