"use client";

import { useState, useEffect } from "react";

interface OuraStatus {
  connected: boolean;
  data?: {
    readiness: { date: string; score: number | null } | null;
    sleep: { date: string; score: number | null; average_hrv: number | null } | null;
  };
  error?: string;
}

export default function SettingsPage() {
  const [ouraStatus, setOuraStatus] = useState<OuraStatus | null>(null);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/wearables/oura")
      .then((r) => r.json())
      .then(setOuraStatus);
  }, []);

  async function connectOura(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/wearables/oura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Connected successfully.");
      setToken("");
      setOuraStatus(await fetch("/api/wearables/oura").then((r) => r.json()));
    } else {
      setMessage(data.error ?? "Connection failed.");
    }
    setSaving(false);
  }

  async function disconnectOura() {
    await fetch("/api/wearables/oura", { method: "DELETE" });
    setOuraStatus({ connected: false });
    setMessage("");
  }

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

        {ouraStatus?.connected && ouraStatus.data && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
            {ouraStatus.data.readiness && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Readiness</span>
                <span className={`font-medium ${(ouraStatus.data.readiness.score ?? 0) >= 70 ? "text-emerald-400" : (ouraStatus.data.readiness.score ?? 0) >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {ouraStatus.data.readiness.score ?? "—"}/100
                </span>
              </div>
            )}
            {ouraStatus.data.sleep && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Sleep score</span>
                  <span className={`font-medium ${(ouraStatus.data.sleep.score ?? 0) >= 70 ? "text-emerald-400" : (ouraStatus.data.sleep.score ?? 0) >= 50 ? "text-amber-400" : "text-red-400"}`}>
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
              <p className="text-amber-400 text-xs">{ouraStatus.error}</p>
            )}
          </div>
        )}

        {ouraStatus?.connected ? (
          <button
            onClick={disconnectOura}
            className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
          >
            Disconnect Oura
          </button>
        ) : (
          <form onSubmit={connectOura} className="space-y-3">
            <p className="text-sm text-zinc-400">
              Enter your Oura Personal Access Token. Generate one at{" "}
              <span className="text-zinc-300">cloud.ouraring.com → Personal Access Tokens</span>.
            </p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Oura Personal Access Token"
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Connecting..." : "Connect Oura"}
            </button>
          </form>
        )}

        {message && (
          <p className={`text-sm ${message.includes("success") ? "text-emerald-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
