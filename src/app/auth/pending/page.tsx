"use client";

import { signOut } from "next-auth/react";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Account pending</h1>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            Your account is awaiting approval. You'll receive an email once you're approved and can sign in.
          </p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
