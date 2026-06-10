"use client";

import { useState } from "react";

export function CollapsibleSection({
  title,
  defaultOpen = true,
  headerRight,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 group"
        >
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide group-hover:text-zinc-400 transition-colors">
            {title}
          </h2>
          <svg
            className={`w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-all ${open ? "rotate-0" : "-rotate-90"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {headerRight && <div>{headerRight}</div>}
      </div>

      {open && children}
    </section>
  );
}
