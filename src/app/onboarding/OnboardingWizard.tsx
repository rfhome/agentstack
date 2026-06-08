"use client";

import { useState, useEffect } from "react";
import type { CycleDay, ProgramConfig } from "@/lib/onboarding/types";

type StepType = "single" | "multi" | "text";

interface StepOption {
  id: string;
  label: string;
  sub?: string;
}

interface Step {
  id: string;
  type: StepType;
  question: string;
  subtext?: string;
  placeholder?: string;
  options?: StepOption[];
}

const STEPS: Step[] = [
  {
    id: "primaryGoal",
    type: "single",
    question: "What's your primary training goal?",
    options: [
      { id: "longevity", label: "Longevity & healthy aging", sub: "Stay strong, mobile, and cognitively healthy long-term" },
      { id: "strength", label: "Build strength & muscle", sub: "Progressive overload and hypertrophy" },
      { id: "weight", label: "Lose weight & improve body composition", sub: "Burn fat while preserving muscle" },
      { id: "endurance", label: "Improve cardiovascular fitness", sub: "Aerobic capacity and endurance base" },
      { id: "general", label: "General fitness & energy", sub: "Feel better, move well, stay consistent" },
    ],
  },
  {
    id: "secondaryGoals",
    type: "multi",
    question: "What else matters to you?",
    subtext: "Select all that apply",
    options: [
      { id: "brain", label: "Brain & cognitive health" },
      { id: "injury", label: "Injury prevention & joint health" },
      { id: "aesthetics", label: "Aesthetics & body composition" },
      { id: "cardio_fitness", label: "Cardiovascular conditioning" },
      { id: "functional", label: "Functional strength for daily life" },
      { id: "performance", label: "Athletic performance" },
    ],
  },
  {
    id: "experience",
    type: "single",
    question: "How long have you been training consistently?",
    options: [
      { id: "beginner", label: "Just getting started" },
      { id: "1-2y", label: "1–2 years" },
      { id: "3-5y", label: "3–5 years" },
      { id: "5plus", label: "5+ years" },
    ],
  },
  {
    id: "split",
    type: "single",
    question: "What training split do you follow?",
    options: [
      { id: "ppla", label: "Push / Pull / Legs / Arms", sub: "4-day cycle" },
      { id: "ppl", label: "Push / Pull / Legs", sub: "3-day cycle" },
      { id: "ul", label: "Upper / Lower", sub: "2–4 days per week" },
      { id: "fullbody", label: "Full body", sub: "2–3 days per week" },
      { id: "unsure", label: "Not sure yet", sub: "I'll follow recommendations" },
    ],
  },
  {
    id: "equipment",
    type: "single",
    question: "Where do you train?",
    options: [
      { id: "limited", label: "Machines-only gym", sub: "Planet Fitness, LA Fitness, etc. — cables, dumbbells, no Olympic barbell" },
      { id: "full", label: "Full commercial gym", sub: "Includes Olympic barbells and power racks" },
      { id: "home", label: "Home gym", sub: "Some equipment available" },
      { id: "minimal", label: "Bodyweight / minimal equipment" },
    ],
  },
  {
    id: "cardio",
    type: "multi",
    question: "What cardio do you include?",
    subtext: "Select all that apply",
    options: [
      { id: "bike", label: "Stationary bike" },
      { id: "treadmill", label: "Treadmill" },
      { id: "rower", label: "Rowing machine" },
      { id: "elliptical", label: "Elliptical" },
      { id: "outdoor", label: "Outdoor running or cycling" },
      { id: "none", label: "No dedicated cardio" },
    ],
  },
  {
    id: "wearables",
    type: "multi",
    question: "Do you use any fitness wearables?",
    subtext: "Select all that apply",
    options: [
      { id: "oura", label: "Oura Ring" },
      { id: "fitbit", label: "Fitbit / Google Fit" },
      { id: "apple", label: "Apple Watch" },
      { id: "garmin", label: "Garmin" },
      { id: "none", label: "None" },
    ],
  },
  {
    id: "injuries",
    type: "text",
    question: "Any injuries or physical limitations we should know about?",
    subtext: "Optional — keeps your program safe",
    placeholder: "e.g. Lower back sensitivity, shoulder impingement, knee issues...",
  },
  {
    id: "otherActivities",
    type: "text",
    question: "Any other sports or physical activities you do regularly?",
    subtext: "Optional — helps account for overall fatigue",
    placeholder: "e.g. Tennis, pickleball, golf, cycling, hiking...",
  },
];

interface OnboardingWizardProps {
  hasProfile: boolean;
  existingProgramConfig?: ProgramConfig | null;
  tier?: string;
}

export function OnboardingWizard({ hasProfile, existingProgramConfig, tier = "free" }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Review state — shown after generation
  const [reviewCycles, setReviewCycles] = useState<CycleDay[] | null>(null);
  // Which wearables the user said they have (from the wizard "wearables" step)
  const selectedWearables = (answers["wearables"] as string[] | undefined) ?? [];

  // Pre-populate answers from existing programConfig (re-running the wizard)
  useEffect(() => {
    if (!existingProgramConfig) return;
    const pc = existingProgramConfig;

    // Reverse-map programConfig fields back to wizard answer IDs
    const goalReverse: Record<string, string> = {
      build_muscle: "strength",
      lose_weight: "weight",
      stay_healthy: "longevity",
      athletic_performance: "endurance",
    };
    const expReverse: Record<string, string> = {
      beginner: "beginner",
      intermediate: "1-2y",
      advanced: "5plus",
    };
    const gymReverse: Record<string, string> = {
      planet_fitness: "limited",
      commercial: "full",
      home_gym: "home",
      bodyweight: "minimal",
    };
    const splitReverse: Record<number, string> = { 4: "ppla", 3: "ppl", 2: "ul" };

    setAnswers({
      primaryGoal: goalReverse[pc.goal] ?? "",
      experience: expReverse[pc.experienceLevel] ?? "",
      equipment: gymReverse[pc.gymType] ?? "",
      split: splitReverse[pc.daysPerWeek] ?? "fullbody",
      injuries: pc.injuries.join(", "),
      otherActivities: pc.otherActivities,
    });
  }, [existingProgramConfig]);

  const currentStep = STEPS[step];

  function canAdvance(): boolean {
    if (!currentStep) return false;
    if (currentStep.type === "single") {
      const val = answers[currentStep.id];
      return typeof val === "string" && val.length > 0;
    }
    return true; // multi and text steps are always skippable
  }

  function handleSingleSelect(optionId: string) {
    setAnswers((prev) => ({ ...prev, [currentStep.id]: optionId }));
  }

  function handleMultiToggle(optionId: string) {
    const current = (answers[currentStep.id] as string[] | undefined) ?? [];
    const updated = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    setAnswers((prev) => ({ ...prev, [currentStep.id]: updated }));
  }

  function handleTextChange(value: string) {
    setAnswers((prev) => ({ ...prev, [currentStep.id]: value }));
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleGenerate();
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      // Show review step with the generated cycle structure
      setReviewCycles(data.cycleStructure ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  }

  // -------------------------------------------------------------------------
  // Generating screen
  // -------------------------------------------------------------------------
  if (generating && !reviewCycles) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-300 text-sm font-medium">Building your training profile...</p>
          <p className="text-xs text-zinc-600 text-center">
            Analyzing your goals, experience, and gym setup
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Review step — shown after generation
  // -------------------------------------------------------------------------
  if (reviewCycles) {
    const splitLabels: Record<string, string> = {
      ppla: "Push / Pull / Legs / Arms",
      ppl: "Push / Pull / Legs",
      ul: "Upper / Lower",
      fullbody: "Full Body",
      unsure: "Full Body",
    };
    const splitLabel = splitLabels[answers.split as string] ?? "Custom";

    return (
      <div className="max-w-lg mx-auto py-12 px-4 space-y-6">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Your program</p>
          <h1 className="text-2xl font-bold text-white">{splitLabel} Split</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Your training profile has been generated. Here's your cycle structure:
          </p>
        </div>

        {/* Cycle day cards */}
        <div className="space-y-2">
          {reviewCycles.map((day) => (
            <div
              key={day.day}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex gap-4 items-center"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center">
                {day.day}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{day.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{day.focus}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-500">
          Your full coaching profile has been saved. Your agents will use it on every session analysis and workout prescription.
        </p>

        {/* Wearable connect step — only for beta/premium users who said they have wearables */}
        {tier !== "free" && (selectedWearables.includes("oura") || selectedWearables.includes("fitbit")) && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
            <p className="text-sm font-medium text-white">Connect your wearables</p>
            <p className="text-xs text-zinc-400">
              Give your agents live recovery and HR data — makes analysis and prescriptions much more accurate.
            </p>
            <div className="flex flex-col gap-2">
              {selectedWearables.includes("oura") && (
                <a
                  href="/api/wearables/oura/authorize"
                  className="flex items-center justify-between rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-3 text-sm text-white transition-colors"
                >
                  <span className="font-medium">Connect Oura Ring</span>
                  <span className="text-zinc-400 text-xs">Readiness, HRV, sleep →</span>
                </a>
              )}
              {selectedWearables.includes("fitbit") && (
                <a
                  href="/api/wearables/fitbit/authorize"
                  className="flex items-center justify-between rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-3 text-sm text-white transition-colors"
                >
                  <span className="font-medium">Connect Fitbit</span>
                  <span className="text-zinc-400 text-xs">HR zones, AZM →</span>
                </a>
              )}
              <button
                onClick={() => { window.location.href = "/fitness"; }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-1"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* How it works — quick loop explanation before the user enters the app */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">How AgentStack works</p>
          <ol className="space-y-3">
            {[
              { n: "1", title: "Log a session", body: "After each workout, record your exercises, weights, reps, and cardio." },
              { n: "2", title: "Run analysis", body: "Three AI agents — Pulse, Forge, and Lens — analyze your performance, strength progression, and recovery in parallel." },
              { n: "3", title: "Get your plan", body: "Nexus synthesizes their findings into one clear recommendation and prescribes your next session." },
            ].map(({ n, title, body }) => (
              <li key={n} className="flex gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center font-semibold mt-0.5">
                  {n}
                </span>
                <span className="text-zinc-300">
                  <span className="font-semibold text-white">{title} — </span>{body}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => { window.location.href = "/fitness"; }}
            className="w-full rounded-xl bg-white text-zinc-950 py-4 text-sm font-bold hover:bg-zinc-200 transition-colors"
          >
            Start training →
          </button>
          <button
            onClick={() => {
              setReviewCycles(null);
              setGenerating(false);
              setStep(STEPS.length - 1);
            }}
            className="w-full rounded-xl border border-zinc-700 text-zinc-400 py-3 text-sm hover:text-white hover:border-zinc-500 transition-colors"
          >
            Go back and change something
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Wizard steps
  // -------------------------------------------------------------------------
  const selectedSingle = typeof answers[currentStep.id] === "string"
    ? (answers[currentStep.id] as string)
    : "";
  const selectedMulti = Array.isArray(answers[currentStep.id])
    ? (answers[currentStep.id] as string[])
    : [];
  const textValue = typeof answers[currentStep.id] === "string"
    ? (answers[currentStep.id] as string)
    : "";

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-6">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "w-6 bg-white" : "w-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Heading */}
        <div>
          <p className="text-xs text-zinc-500 mb-1">
            {hasProfile ? "Update your training profile" : "Set up your training profile"}
            {" · "}Step {step + 1} of {STEPS.length}
          </p>
          <p className="text-base text-white font-semibold">{currentStep.question}</p>
          {currentStep.subtext && (
            <p className="mt-0.5 text-sm text-zinc-400">{currentStep.subtext}</p>
          )}
        </div>

        {/* Answer area */}
        <div>
          {currentStep.type === "single" && currentStep.options && (
            <div className="grid grid-cols-1 gap-2">
              {currentStep.options.map((opt) => {
                const isSelected = selectedSingle === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSingleSelect(opt.id)}
                    className={`rounded-xl border p-4 cursor-pointer text-left transition-colors ${
                      isSelected
                        ? "border-white bg-white/10 text-white"
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    <span className="font-medium text-sm">{opt.label}</span>
                    {opt.sub && (
                      <p className="text-xs text-zinc-400 mt-0.5">{opt.sub}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.type === "multi" && currentStep.options && (
            <div className="grid grid-cols-1 gap-2">
              {currentStep.options.map((opt) => {
                const isSelected = selectedMulti.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleMultiToggle(opt.id)}
                    className={`relative rounded-xl border p-4 cursor-pointer text-left transition-colors ${
                      isSelected
                        ? "border-white bg-white/10 text-white"
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 text-white text-xs font-bold">✓</span>
                    )}
                    <span className="font-medium text-sm pr-5">{opt.label}</span>
                    {opt.sub && (
                      <p className="text-xs text-zinc-400 mt-0.5">{opt.sub}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.type === "text" && (
            <textarea
              value={textValue}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={currentStep.placeholder}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 p-3 text-sm resize-none h-24 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="text-zinc-500 hover:text-white text-sm transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="rounded-lg bg-white text-zinc-950 px-6 py-2.5 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-30 transition-colors"
          >
            {step === STEPS.length - 1 ? "Generate my profile →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
