export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApprovePanel } from "@/components/ApprovePanel";

export default async function AdminPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const session = await auth();
  if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
    redirect("/fitness");
  }

  const [feedback, errorLogs, pendingUsers, recentUsers] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.agentLog.findMany({
      where: { response: { contains: "JSON parse failed" } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, agentName: true, createdAt: true, userId: true, sessionId: true },
    }),
    prisma.user.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, createdAt: true, tier: true },
    }),
    prisma.user.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, email: true, createdAt: true, tier: true },
    }),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-white">Admin</h1>

      {/* Pending approvals */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Pending approval ({pendingUsers.length})
        </h2>
        {pendingUsers.length === 0 ? (
          <p className="text-zinc-500 text-sm">No users waiting for approval.</p>
        ) : (
          <div className="space-y-2">
            {pendingUsers.map((u) => (
              <ApprovePanel key={u.id} user={u} />
            ))}
          </div>
        )}
      </section>

      {/* Feedback */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Feedback ({feedback.length})
        </h2>
        {feedback.length === 0 ? (
          <p className="text-zinc-500 text-sm">No feedback yet.</p>
        ) : (
          <div className="space-y-2">
            {feedback.map((f) => (
              <div key={f.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-1.5">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{f.content}</p>
                <p className="text-xs text-zinc-600">
                  {new Date(f.createdAt).toLocaleString()} · user {f.userId ?? "anonymous"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Agent parse failures */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Agent parse failures ({errorLogs.length})
        </h2>
        {errorLogs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No parse failures logged.</p>
        ) : (
          <div className="space-y-2">
            {errorLogs.map((e) => (
              <div key={e.id} className="rounded-xl border border-red-900/50 bg-zinc-900 px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-zinc-300">{e.agentName} · session {e.sessionId ?? "—"}</span>
                <span className="text-zinc-600 text-xs">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active users */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Active users ({recentUsers.length})
        </h2>
        <div className="space-y-2">
          {recentUsers.map((u) => (
            <div key={u.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <span className="text-zinc-200">{u.name ?? "—"}</span>
                <span className="text-zinc-500 ml-2">{u.email}</span>
                <span className="text-zinc-600 ml-2 text-xs">{u.tier}</span>
              </div>
              <span className="text-zinc-600 text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
