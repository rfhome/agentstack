"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-zinc-400 text-sm">Invalid or missing reset token.</p>
        <Link href="/auth/forgot-password" className="text-zinc-300 hover:text-white text-sm">
          Request a new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/auth/signin?reset=1");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to reset password. The link may have expired.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-zinc-400 mb-1">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-zinc-950 rounded-lg py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {loading ? "Resetting..." : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Reset password</h1>
          <p className="mt-1 text-sm text-zinc-400">Enter your new password below.</p>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-sm text-zinc-500 text-center">
          <Link href="/auth/signin" className="text-zinc-300 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
