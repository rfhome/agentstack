"use client";

import { useState } from "react";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function handleOpen() {
    setOpen(true);
    setStatus("idle");
    setContent("");
  }

  function handleClose() {
    setOpen(false);
    setStatus("idle");
    setContent("");
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
      setTimeout(handleClose, 1800);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-4 z-40 flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 shadow-lg transition-colors"
        aria-label="Send feedback"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M2 2h12v9H9l-3 3v-3H2V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Send feedback</h2>
              <button onClick={handleClose} className="text-zinc-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <p className="text-xs text-zinc-500">Bug report, feature idea, or anything on your mind — we read everything.</p>

            {status === "sent" ? (
              <p className="text-sm text-emerald-400 py-4 text-center">Thanks, got it!</p>
            ) : (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 p-3 text-sm resize-none focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">{content.length}/2000</span>
                  <div className="flex items-center gap-3">
                    {status === "error" && (
                      <span className="text-xs text-red-400">Failed — please try again</span>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={!content.trim() || status === "sending"}
                      className="rounded-lg bg-white text-zinc-950 px-4 py-1.5 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-colors"
                    >
                      {status === "sending" ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
