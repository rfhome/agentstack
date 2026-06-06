"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface OuraStatus {
  connected: boolean;
  data?: {
    readiness: { date: string; score: number | null } | null;
    sleep: { date: string; score: number | null; average_hrv: number | null } | null;
  };
  error?: string;
}

interface FitbitHRZone {
  name: string;
  minutes: number;
  caloriesOut: number;
}

interface FitbitStatus {
  connected: boolean;
  data?: {
    heartRateZones: FitbitHRZone[];
    activeZoneMinutes: number | null;
    veryActiveMinutes: number | null;
    fairlyActiveMinutes: number | null;
  };
  error?: string;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [ouraStatus, setOuraStatus] = useState<OuraStatus | null>(null);
  const [fitbitStatus, setFitbitStatus] = useState<FitbitStatus | null>(null);
  const [tier, setTier] = useState<string>("free");
  const [promoCode, setPromoCode] = useState("");
  const [redeemState, setRedeemState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [redeemMsg, setRedeemMsg] = useState("");
  const oauthError = searchParams.get("error");

  useEffect(() => {
    fetch("/api/wearables/oura")
      .then((r) => r.json())
      .then(setOuraStatus);
    fetch("/api/wearables/fitbit")
      .then((r) => r.json())
      .then(setFitbitStatus);
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: { tier?: string }) => { if (p.tier) setTier(p.tier); });
  }, []);

  async function handleRedeem() {
    const code = promoCode.trim();
    if (!code) return;
    setRedeemState("loading");
    setRedeemMsg("");
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { tier?: string; error?: string };
      if (!res.ok) {
        setRedeemState("error");
        setRedeemMsg(data.error ?? "Redemption failed");
      } else {
        setRedeemState("success");
        setTier(data.tier ?? tier);
        setRedeemMsg(`Access upgraded to ${data.tier ?? "beta"}`);
        setPromoCode("");
      }
    } catch {
      setRedeemState("error");
      setRedeemMsg("Something went wrong");
    }
  }

  async function disconnectOura() {
    await fetch("/api/wearables/oura", { method: "DELETE" });
    setOuraStatus({ connected: false });
  }

  async function disconnectFitbit() {
    await fetch("/api/wearables/fitbit", { method: "DELETE" });
    setFitbitStatus({ connected: false });
  }

  const scoreColor = (score: number | null) =>
    score == null ? "text-zinc-400"
    : score >= 70 ? "text-emerald-400"
    : score >= 50 ? "text-amber-400"
    : "text-red-400";

  const fitbitZones = fitbitStatus?.data?.heartRateZones?.filter(
    (z) => ["Fat Burn", "Cardio", "Peak"].includes(z.name)
  ) ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      {/* Oura Ring */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-medium text-white">Oura Ring</h2>
          {ouraStatus?.connected ? (
            <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full">Connected</span>
          ) : (
            <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">Not connected</span>
          )}
        </div>

        {oauthError === "oura_oauth_failed" && (
          <p className="text-sm text-red-400">Connection failed — please try again.</p>
        )}

        {ouraStatus?.connected && ouraStatus.data && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
            {ouraStatus.data.readiness && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Readiness</span>
                <span className={`font-medium ${scoreColor(ouraStatus.data.readiness.score)}`}>
                  {ouraStatus.data.readiness.score ?? "—"}/100
                </span>
              </div>
            )}
            {ouraStatus.data.sleep && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Sleep score</span>
                  <span className={`font-medium ${scoreColor(ouraStatus.data.sleep.score)}`}>
                    {ouraStatus.data.sleep.score ?? "—"}/100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">HRV</span>
                  <span className="text-white font-medium">{ouraStatus.data.sleep.average_hrv ?? "—"} ms</span>
                </div>
              </>
            )}
            {ouraStatus.error && (
              <p className="text-amber-400 text-xs mt-1">{ouraStatus.error}</p>
            )}
          </div>
        )}

        {ouraStatus === null && (
          <div className="text-sm text-zinc-500">Loading...</div>
        )}

        {ouraStatus?.connected ? (
          <button
            onClick={disconnectOura}
            className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
          >
            Disconnect Oura
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Connect your Oura Ring to give Lens real-time recovery data — readiness score, HRV, and sleep quality — before every analysis.
            </p>
            <a
              href="/api/wearables/oura/authorize"
              className="inline-block bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Connect Oura Ring
            </a>
          </div>
        )}
      </section>

      {/* Fitbit */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-medium text-white">Fitbit</h2>
          {fitbitStatus?.connected ? (
            <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full">Connected</span>
          ) : (
            <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">Not connected</span>
          )}
        </div>

        {oauthError === "fitbit_oauth_failed" && (
          <p className="text-sm text-red-400">Connection failed — please try again.</p>
        )}

        {fitbitStatus?.connected && fitbitStatus.data && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
            {fitbitZones.length > 0 && (
              <div className="space-y-1">
                <p className="text-zinc-400 text-xs uppercase tracking-wide mb-2">HR Zones (today)</p>
                {fitbitZones.map((zone) => (
                  <div key={zone.name} className="flex items-center justify-between">
                    <span className="text-zinc-400">{zone.name}</span>
                    <span className="text-white font-medium">{zone.minutes} min</span>
                  </div>
                ))}
              </div>
            )}
            {fitbitStatus.data.activeZoneMinutes != null && (
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                <span className="text-zinc-400">Active Zone Minutes</span>
                <span className="text-white font-medium">{fitbitStatus.data.activeZoneMinutes} AZM</span>
              </div>
            )}
            {fitbitStatus.error && (
              <p className="text-amber-400 text-xs mt-1">{fitbitStatus.error}</p>
            )}
          </div>
        )}

        {fitbitStatus === null && (
          <div className="text-sm text-zinc-500">Loading...</div>
        )}

        {fitbitStatus?.connected ? (
          <button
            onClick={disconnectFitbit}
            className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
          >
            Disconnect Fitbit
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Connect your Fitbit to give Pulse real-time HR zone data — Fat Burn, Cardio, and Peak minutes — for precise session intensity classification.
            </p>
            <a
              href="/api/wearables/fitbit/authorize"
              className="inline-block bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Connect Fitbit
            </a>
          </div>
        )}
      </section>

      {/* Access tier */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-medium text-white">Access</h2>
          {tier === "free" && (
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">Free</span>
          )}
          {tier === "beta" && (
            <span className="text-xs bg-violet-900/40 text-violet-300 px-2 py-0.5 rounded-full">Beta</span>
          )}
          {tier === "premium" && (
            <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full">Premium</span>
          )}
        </div>

        {tier === "free" && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Have an invite code? Enter it below to unlock beta features.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                placeholder="ENTER CODE"
                className="flex-1 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 uppercase tracking-widest focus:outline-none focus:border-zinc-600"
                maxLength={24}
              />
              <button
                onClick={handleRedeem}
                disabled={redeemState === "loading" || !promoCode.trim()}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {redeemState === "loading" ? "..." : "Redeem"}
              </button>
            </div>
            {redeemMsg && (
              <p className={`text-sm ${redeemState === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {redeemMsg}
              </p>
            )}
          </div>
        )}

        {tier !== "free" && (
          <p className="text-sm text-zinc-400">
            You have {tier} access. New features will be unlocked as they ship.
          </p>
        )}
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
