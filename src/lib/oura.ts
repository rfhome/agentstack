const OURA_BASE = "https://api.ouraring.com/v2/usercollection";

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
  total_sleep_duration: number | null; // seconds
  efficiency: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
}

export interface OuraData {
  readiness: OuraReadiness | null;
  sleep: OuraSleep | null;
  fetchedAt: string;
}

async function ouraGet<T>(path: string, token: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${OURA_BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
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

export async function fetchOuraData(token: string): Promise<OuraData> {
  const start = yesterday();
  const end = today();

  const [readinessRes, sleepRes] = await Promise.allSettled([
    ouraGet<{ data: OuraReadiness[] }>("daily_readiness", token, { start_date: start, end_date: end }),
    ouraGet<{ data: OuraSleep[] }>("daily_sleep", token, { start_date: start, end_date: end }),
  ]);

  // Take the most recent entry from each
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
