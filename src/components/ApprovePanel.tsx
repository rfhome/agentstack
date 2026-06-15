"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PendingUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  tier: string;
}

export function ApprovePanel({ user }: { user: PendingUser }) {
  const router = useRouter();
  const [tier, setTier] = useState("free");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleApprove() {
    setLoading(true);
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, tier }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  if (done) return null;

  return (
    <div className="rounded-xl border border-amber-900/40 bg-zinc-900 px-4 py-3 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <span className="text-zinc-200 font-medium">{user.name ?? "—"}</span>
        <span className="text-zinc-500 ml-2">{user.email}</span>
        <span className="text-zinc-600 ml-2 text-xs">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      </div>
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none"
      >
        <option value="free">free</option>
        <option value="beta">beta</option>
        <option value="premium">premium</option>
      </select>
      <button
        onClick={handleApprove}
        disabled={loading}
        className="bg-white text-zinc-950 rounded-lg px-3 py-1 text-xs font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 shrink-0"
      >
        {loading ? "Approving..." : "Approve"}
      </button>
    </div>
  );
}
