"use client";

import { useSession, signOut } from "next-auth/react";

// Deterministic color from a string — cycles through a muted palette
function avatarColor(seed: string): string {
  const colors = [
    "bg-violet-700", "bg-blue-700", "bg-emerald-700",
    "bg-amber-700",  "bg-rose-700",  "bg-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (email ?? "?").slice(0, 2).toUpperCase();
}

export default function NavUser() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const seed = session.user.email ?? session.user.name ?? "user";
  const bg = avatarColor(seed);
  const letters = initials(session.user.name, session.user.email);
  const image = session.user.image;

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="hidden md:block text-sm text-zinc-400">
        {session.user.name ?? session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className="text-sm text-zinc-500 hover:text-white transition-colors hidden md:block"
      >
        Sign out
      </button>
      {/* Avatar — initials with deterministic color, or OAuth profile photo */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden ${image ? "" : bg}`}>
        {image
          ? <img src={image} alt={session.user.name ?? "avatar"} className="w-full h-full object-cover" />
          : letters
        }
      </div>
    </div>
  );
}
