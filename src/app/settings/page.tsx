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

function SettingsContent() {
  const searchParams = useSearchParams();
  const [ouraStatus, setOuraStatus] = useState<OuraStatus | null>(null);
  const oauthError = searchParams.get("error");

  useEffect(() => {
    fetch("/api/wearables/oura")
      .then((r) => r.json())
      .then(setOuraStatus);
  }, []);

  async function disconnectOura() {
    await fetch("/api/wearables/oura", { method: "DELETE" });
    setOuraStatus({ connected: false });
  }

  const scoreColor = (score: number | null) =>
    score == null ? "text-zinc-400"
    : score >= 70 ? "text-emerald-400"
    : score >= 50 ? "text-amber-400"
    : "text-red-400";

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

        {oauthError && (
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
