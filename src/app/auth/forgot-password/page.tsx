"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Forgot password</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-emerald-800 bg-emerald-900/20 px-4 py-3">
            <p className="text-sm text-emerald-300">
              If an account exists for that email, you'll receive a reset link shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-zinc-950 rounded-lg py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-sm text-zinc-500 text-center">
          <Link href="/auth/signin" className="text-zinc-300 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
