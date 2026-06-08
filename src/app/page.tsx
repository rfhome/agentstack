import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";

export default async function RootPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/fitness");

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-10">
      {/* Hero */}
      <div className="space-y-4 max-w-lg">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">AgentStack</p>
        <h1 className="text-4xl font-bold text-white leading-tight">
          Your personal AI<br />coaching team
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Log a session. Three specialized AI agents analyze your performance,
          recovery, and strength progression in parallel — then synthesize it
          into one clear plan for your next workout.
        </p>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          { name: "Pulse", color: "border-blue-800 bg-blue-950/30", dot: "bg-blue-400", desc: "Performance & progressive overload" },
          { name: "Forge", color: "border-amber-800 bg-amber-950/30", dot: "bg-amber-400", desc: "Strength prescription" },
          { name: "Lens",  color: "border-emerald-800 bg-emerald-950/30", dot: "bg-emerald-400", desc: "Recovery & longevity" },
          { name: "Nexus", color: "border-zinc-600 bg-zinc-800/40", dot: "bg-white", desc: "Synthesis & your next session" },
        ].map(({ name, color, dot, desc }) => (
          <div key={name} className={`rounded-xl border ${color} p-3 text-left`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className="text-xs font-semibold text-white">{name}</span>
            </div>
            <p className="text-xs text-zinc-400 leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="w-full max-w-sm space-y-2 text-left">
        {[
          { n: "1", text: "Log your exercises, weights, and cardio after each session" },
          { n: "2", text: "Agents analyze performance, recovery, and trends in parallel" },
          { n: "3", text: "Get one clear recommendation and a prescription for next time" },
        ].map(({ n, text }) => (
          <div key={n} className="flex gap-3 items-start text-sm text-zinc-400">
            <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center font-semibold mt-0.5">{n}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/auth/signup"
          className="rounded-xl bg-white text-zinc-950 px-8 py-3 text-sm font-bold hover:bg-zinc-200 transition-colors"
        >
          Get started — it&apos;s free
        </Link>
        <p className="text-xs text-zinc-500">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
