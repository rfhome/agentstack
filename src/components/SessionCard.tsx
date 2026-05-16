type Exercise = {
  id: number;
  name: string;
  sets: number | null;
  reps: string | null;
  weights?: string | null;
  weightLbs: number | null;
};

type Session = {
  id: number;
  date: string;
  cycleDay: number | null;
  cycleNumber: number | null;
  durationMinutes: number | null;
  avgHeartRate: number | null;
  rating: string | null;
  notes: string | null;
  exercises: Exercise[];
  analyzed?: boolean;
};

const CYCLE_LABELS: Record<number, string> = { 1: "Push", 2: "Pull", 3: "Legs", 4: "Arms" };
const RATING_COLOR: Record<string, string> = {
  A: "text-emerald-400",
  B: "text-amber-400",
  C: "text-red-400",
};

export function SessionCard({ session }: { session: Session }) {
  const label = session.cycleDay ? CYCLE_LABELS[session.cycleDay] ?? `Day ${session.cycleDay}` : "Session";
  const date = new Date(session.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-zinc-500">{date}</span>
          <h3 className="font-semibold text-white">
            {label}
            {session.cycleNumber ? <span className="text-zinc-400 font-normal"> · Cycle {session.cycleNumber}</span> : null}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {session.analyzed != null && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${session.analyzed ? "bg-violet-900/40 text-violet-400" : "bg-zinc-800 text-zinc-500"}`}>
              {session.analyzed ? "Analyzed" : "Not analyzed"}
            </span>
          )}
          {session.rating && (
            <span className={`text-xl font-bold ${RATING_COLOR[session.rating] ?? "text-zinc-400"}`}>
              {session.rating}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 text-xs text-zinc-400">
        {session.durationMinutes && <span>{session.durationMinutes}min</span>}
        {session.avgHeartRate && <span>♥ {session.avgHeartRate}bpm</span>}
      </div>

      {session.exercises.length > 0 && (
        <div className="space-y-1">
          {session.exercises.map((ex) => (
            <div key={ex.id} className="flex justify-between text-sm">
              <span className="text-zinc-300">{ex.name}</span>
              <span className="text-zinc-500 tabular-nums">
                {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ""}
                {ex.weights ? ` @ ${ex.weights}lbs` : ex.weightLbs ? ` @ ${ex.weightLbs}lbs` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {session.notes && (
        <p className="text-xs text-zinc-500 italic">{session.notes}</p>
      )}
    </div>
  );
}
