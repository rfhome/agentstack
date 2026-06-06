"use client";

import { useSession, signOut } from "next-auth/react";

export default function NavUser() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <div className="ml-auto flex items-center gap-3">
      {/* Name hidden on mobile — visible on desktop */}
      <span className="hidden md:block text-sm text-zinc-400">
        {session.user.name ?? session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className="text-sm text-zinc-500 hover:text-white transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
