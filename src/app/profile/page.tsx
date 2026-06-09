"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Lightweight markdown renderer — handles the patterns the training context
// actually uses: h1/h2/h3, bold, bullet lists, horizontal rules, paragraphs.
// ---------------------------------------------------------------------------
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

function MarkdownView({ text }: { text: string }) {
  if (!text.trim()) {
    return (
      <p className="text-zinc-500 italic text-sm">
        No training context yet. Click Edit to add your program, goals, and health history.
      </p>
    );
  }

  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let i = 0;

  function flushList() {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="space-y-1 pl-4 list-none">
        {listItems.map((item, j) => (
          <li key={j} className="flex gap-2 text-sm text-zinc-300">
            <span className="text-zinc-600 shrink-0 mt-0.5">–</span>
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = line.match(/^(#+)/)?.[1].length ?? 1;
      const content = line.replace(/^#+\s*/, "");
      if (level === 1) {
        nodes.push(<h2 key={i} className="text-base font-bold text-white mt-5 mb-1">{renderInline(content)}</h2>);
      } else if (level === 2) {
        nodes.push(<h3 key={i} className="text-sm font-semibold text-zinc-200 mt-4 mb-0.5">{renderInline(content)}</h3>);
      } else {
        nodes.push(<h4 key={i} className="text-sm font-medium text-zinc-300 mt-3">{renderInline(content)}</h4>);
      }
    } else if (/^[-*]\s/.test(line)) {
      listItems.push(line.replace(/^[-*]\s/, ""));
    } else if (/^---+$|^___+$/.test(line.trim())) {
      flushList();
      nodes.push(<hr key={i} className="border-zinc-800 my-3" />);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={i} className="text-sm text-zinc-300 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }

    i++;
  }

  flushList();
  return <div className="space-y-1.5">{nodes}</div>;
}

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setContext(data.context ?? "");
        setDraft(data.context ?? "");
        if (!data.context) setEditing(true);
      });
  }, []);

  function handleEdit() {
    setDraft(context);
    setEditing(true);
    setStatus("idle");
  }

  function handleCancel() {
    setDraft(context);
    setEditing(false);
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, context: draft }),
      });
      if (!res.ok) throw new Error("Save failed");
      setContext(draft);
      setEditing(false);
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-300">Coaching profile</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                What the agents read to understand your program, goals, and health history.
              </p>
            </div>
            {!editing && (
              <button
                onClick={handleEdit}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors shrink-0"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <textarea
              id="context"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm font-mono resize-none overflow-y-auto"
              style={{ height: "600px" }}
              placeholder="Describe your training program, goals, and health history..."
              autoFocus
            />
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 min-h-[8rem] max-h-[600px] overflow-y-auto">
              <MarkdownView text={context} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={status === "saving"}
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "saving" ? "Saving..." : "Save"}
              </button>
              {context && (
                <button
                  onClick={handleCancel}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </>
          ) : (
            status === "saved" && (
              <p className="text-sm text-emerald-400">Saved</p>
            )
          )}
          {status === "error" && (
            <p className="text-sm text-red-400">Failed to save. Please try again.</p>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <Link
          href="/onboarding"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ↺ Redo setup wizard
        </Link>
      </div>
    </div>
  );
}
