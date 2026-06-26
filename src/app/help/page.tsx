export const metadata = { title: "AgentStack — How It Works" };

const SECTIONS = [
  {
    id: "log",
    title: "Logging a Session",
    description:
      "Tap the Fitness tab and select a cycle day (Push / Pull / Legs / Arms). Log each exercise with sets, reps, and weights. Add cardio entries (warmup, finisher, or standalone) with duration and distance. When you're done, tap Save & Analyze.",
    steps: [
      "Choose your cycle day at the top of the Log screen.",
      "Add exercises — enter name, sets, reps, and the weights used for each set.",
      "Tap + Cardio to log bike, treadmill, rower, or elliptical entries.",
      "Optionally add post-workout notes, then tap Save & Analyze.",
    ],
  },
  {
    id: "analyze",
    title: "Save & Analyze",
    description:
      "After tapping Save & Analyze, your session is saved immediately and then sent to four AI agents in parallel. The analysis typically takes 60–100 seconds. You'll see a live summary of what was logged while you wait.",
    steps: [
      "Pulse (Claude) evaluates your strength and training load.",
      "Forge (GPT-4o) reviews your program design and progression.",
      "Lens (Gemini) assesses recovery and longevity signals from wearable data.",
      "Nexus (Claude) synthesizes all three into one unified recommendation.",
    ],
  },
  {
    id: "rating",
    title: "Session Rating",
    description:
      "After analysis, Nexus suggests a session rating (A / B / C) with a one-line reason. You can accept the suggestion or choose a different rating. Ratings help the agents track your training quality over time.",
    steps: [
      "Review the suggested rating and the reason given.",
      "Tap Accept to save it, or choose A, B, or C manually.",
      "If you navigate away before rating, a 'Rate ↓' badge appears on the session in History — tap it to rate later.",
    ],
  },
  {
    id: "history",
    title: "Session History",
    description:
      "The History tab shows all your logged sessions. Tap any session to expand it and see exercises, cardio, the Nexus recommendation, and individual agent breakdowns. Sessions that haven't been analyzed yet show a Run Analysis button.",
    steps: [
      "Expand a session card to see full details.",
      "Tap Run Analysis on any unanalyzed session.",
      "Tap individual agent chips (Pulse, Forge, Lens) to see their specific feedback.",
      "Accept a pending rating directly from History using the amber Rate ↓ badge.",
    ],
  },
  {
    id: "goals",
    title: "Goals & Progression",
    description:
      "AgentStack automatically sets strength goals based on your profile. When you hit a goal — matching the target weight and reps in a session — it's marked as achieved and a new progressive target is created (+5lbs). You'll see a confirmation banner right after analysis completes.",
    steps: [
      "Goals are generated during onboarding based on your answers.",
      "The agents use your active goals as context when writing recommendations.",
      "Hit the target weight × reps in any session and the goal is marked complete automatically.",
      "A new target (+5lbs) is immediately created so progression continues.",
    ],
  },
  {
    id: "progress",
    title: "Progress Charts",
    description:
      "The Progress tab shows volume and intensity trends across your recent sessions. If you have a wearable connected, you'll also see HRV, resting heart rate, and sleep trend charts.",
    steps: [
      "Volume chart: total sets × reps per session over time.",
      "Intensity chart: average heart rate trend.",
      "Apple Health section: HRV, resting HR, and sleep hours from the last 28 days.",
      "Oura / Fitbit data is pulled automatically at analysis time.",
    ],
  },
  {
    id: "wearables",
    title: "Connecting Wearables",
    description:
      "AgentStack supports Fitbit, Oura Ring, and Apple Health (via the Health Auto Export app). Go to Settings → Wearables to connect. Wearable data flows into the Lens agent and enriches every analysis.",
    steps: [
      "Fitbit: tap Connect and sign in with your Fitbit account.",
      "Oura: tap Connect and enter your Oura Personal Access Token.",
      "Apple Health: install Health Auto Export on your iPhone, copy the webhook URL from Settings, and paste it into the app's automation.",
    ],
  },
  {
    id: "install",
    title: "Installing the App",
    description:
      "AgentStack is a Progressive Web App — you can add it to your home screen for a native-app feel with no App Store required.",
    steps: [
      "Android / Chrome: tap the Install app button in the header, then confirm.",
      "iPhone / Safari: tap the Share button at the bottom of Safari, scroll down, and tap Add to Home Screen.",
      "Once installed, the app opens full-screen with no browser chrome.",
    ],
  },
];

function Screenshot({ label }: { label: string }) {
  return (
    <div className="w-full rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex items-center justify-center py-16">
      <span className="text-zinc-600 text-sm">[Screenshot: {label}]</span>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-16">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">How AgentStack Works</h1>
          <p className="text-zinc-400">
            A quick guide to logging sessions, understanding your analysis, and getting the most out of
            your AI coaching team.
          </p>
        </div>

        {/* Table of contents */}
        <nav className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">On this page</p>
          <ul className="space-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        {SECTIONS.map((s, i) => (
          <section key={s.id} id={s.id} className="space-y-6 scroll-mt-8">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">0{i + 1}</p>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="text-zinc-400 leading-relaxed">{s.description}</p>
            </div>

            <Screenshot label={s.title} />

            <ol className="space-y-2">
              {s.steps.map((step, j) => (
                <li key={j} className="flex gap-3 text-sm">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center font-medium mt-0.5">
                    {j + 1}
                  </span>
                  <span className="text-zinc-300 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            {i < SECTIONS.length - 1 && <hr className="border-zinc-800" />}
          </section>
        ))}

        {/* Footer */}
        <div className="text-center space-y-2 pb-8">
          <p className="text-zinc-500 text-sm">Still have questions? Reach out to your coach.</p>
          <a href="/fitness" className="text-sm text-white underline underline-offset-4">
            Back to app →
          </a>
        </div>
      </div>
    </div>
  );
}
