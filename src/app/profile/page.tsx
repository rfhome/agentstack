"use client";

import { useState, useEffect } from "react";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setContext(data.context ?? "");
      });
  }, []);

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, context }),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Profile</h1>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300" htmlFor="context">
            Training context (markdown)
          </label>
          <p className="text-xs text-zinc-500">
            This is what the agents read to understand your program, goals, and health history.
          </p>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={20}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm font-mono resize-y"
            placeholder="Describe your training program, goals, and health history in markdown..."
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-400">Failed to save. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}
