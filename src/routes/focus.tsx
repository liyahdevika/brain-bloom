import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, Card, btn } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Play, Pause, RotateCcw, Coffee, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus Zone — BrainBloom" },
      {
        name: "description",
        content: "A focus timer with a distraction shield checklist and break mode.",
      },
      { property: "og:title", content: "Focus Zone — BrainBloom" },
      {
        property: "og:description",
        content: "A focus timer with a distraction shield checklist and break mode.",
      },
    ],
  }),
  component: Focus,
});

const CHECKLIST = [
  "Phone on silent or in another room",
  "Unneeded tabs and apps closed",
  "Water and materials ready",
  "I know what I'm working on",
];

type Phase = "setup" | "focus" | "complete" | "break";

function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const end = useRef(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((end.current - Date.now()) / 1000));
      setRemaining(r);
      if (r === 0) setRunning(false);
    }, 250);
    return () => clearInterval(t);
  }, [running]);
  return {
    remaining,
    running,
    start: (secs: number) => {
      end.current = Date.now() + secs * 1000;
      setRemaining(secs);
      setRunning(true);
    },
    pause: () => setRunning(false),
    resume: () => {
      end.current = Date.now() + remaining * 1000;
      setRunning(true);
    },
    reset: (secs: number) => {
      setRunning(false);
      setRemaining(secs);
    },
  };
}

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Focus() {
  const { addSession, updateSession } = useStore();
  const [phase, setPhase] = useState<Phase>("setup");
  const [minutes, setMinutes] = useState(25);
  const [custom, setCustom] = useState("");
  const [checks, setChecks] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [distractions, setDistractions] = useState("");
  const [rating, setRating] = useState(4);
  const [savedReflection, setSavedReflection] = useState(false);
  const [started, setStarted] = useState(false);
  const t = useCountdown();
  const total = (phase === "break" ? 5 : minutes) * 60;

  useEffect(() => {
    if (started && !t.running && t.remaining === 0) {
      if (phase === "focus") {
        setSessionId(addSession({ minutes }));
        setPhase("complete");
        setStarted(false);
      } else if (phase === "break") {
        setPhase("setup");
        setStarted(false);
      }
    }
  }, [t.running, t.remaining, started, phase]);

  const begin = () => {
    setPhase("focus");
    setStarted(true);
    setSavedReflection(false);
    t.start(minutes * 60);
  };
  const pct = started || phase === "focus" || phase === "break" ? 1 - t.remaining / total : 0;

  if (phase === "complete") {
    return (
      <AppShell
        title="Session complete 🌸"
        subtitle={`You focused for ${minutes} minutes. Nice work.`}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" /> Distraction reflection
            </h3>
            <label className="mt-4 block text-sm font-semibold">
              What pulled your attention away, if anything?
            </label>
            <textarea
              value={distractions}
              onChange={(e) => setDistractions(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border bg-background p-3"
              placeholder="e.g. a notification, hunger, daydreaming…"
            />
            <label className="mt-4 block text-sm font-semibold">
              How focused were you? ({rating}/5)
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(+e.target.value)}
              className="w-full accent-primary"
            />
            <button
              className={`${btn.soft} mt-4`}
              disabled={savedReflection}
              onClick={() => {
                if (sessionId) updateSession(sessionId, { distractions, focusRating: rating });
                setSavedReflection(true);
              }}
            >
              {savedReflection ? "Saved ✓" : "Save reflection"}
            </button>
          </Card>
          <Card className="flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Lock in what you learned</h3>
              <p className="mt-1 text-muted-foreground">
                Timer minutes don't earn XP — explaining your learning does. Take the ThinkBack
                Challenge for +15 XP.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/thinkback" className={btn.primary}>
                ThinkBack Challenge
              </Link>
              <button
                className={btn.lav}
                onClick={() => {
                  setPhase("break");
                  setStarted(true);
                  t.start(300);
                }}
              >
                <Coffee className="h-4 w-4" /> 5-min break
              </button>
              <button
                className={btn.soft}
                onClick={() => {
                  setPhase("setup");
                  setDistractions("");
                }}
              >
                New session
              </button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  const active = phase === "focus" || phase === "break";
  return (
    <AppShell
      title={phase === "break" ? "Break time ☕" : "Focus Zone"}
      subtitle={
        phase === "break"
          ? "Stretch, hydrate, look away from screens."
          : "Pick a duration, check your shield, and begin."
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col items-center py-8">
          <div className="relative grid h-64 w-64 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="45" className="fill-none stroke-muted" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="45"
                className={`fill-none transition-all ${phase === "break" ? "stroke-lavender" : "stroke-primary"}`}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={283}
                strokeDashoffset={283 * (1 - pct)}
              />
            </svg>
            <span className="font-display text-5xl font-semibold text-sage-deep" aria-live="polite">
              {fmt(active ? t.remaining : minutes * 60)}
            </span>
          </div>
          {!active && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[25, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={
                    minutes === m ? btn.primary.replace("px-6 py-3", "px-5 py-2.5") : btn.soft
                  }
                >
                  {m} min
                </button>
              ))}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = parseInt(custom);
                  if (n >= 1 && n <= 180) setMinutes(n);
                }}
              >
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  type="number"
                  min={1}
                  max={180}
                  placeholder="Custom"
                  className="w-24 rounded-full border bg-background px-4"
                />
                <button className={btn.lav}>Set</button>
              </form>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!active && (
              <button className={btn.primary} onClick={begin}>
                <Play className="h-5 w-5" /> Start
              </button>
            )}
            {active && t.running && (
              <button className={btn.primary} onClick={t.pause}>
                <Pause className="h-5 w-5" /> Pause
              </button>
            )}
            {active && !t.running && t.remaining > 0 && (
              <button className={btn.primary} onClick={t.resume}>
                <Play className="h-5 w-5" /> Resume
              </button>
            )}
            {active && (
              <button
                className={btn.soft}
                onClick={() => {
                  t.reset(minutes * 60);
                  setStarted(false);
                  setPhase("setup");
                }}
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" /> Distraction Shield
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            BrainBloom can't block other apps — this checklist helps you set up your own shield.
          </p>
          <ul className="mt-4 space-y-2">
            {CHECKLIST.map((c, i) => (
              <li key={c}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() => setChecks((p) => p.map((v, j) => (j === i ? !v : v)))}
                    className="h-5 w-5 accent-primary"
                  />
                  <span className={checks[i] ? "line-through text-muted-foreground" : ""}>{c}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-primary">
            {checks.filter(Boolean).length}/{CHECKLIST.length} ready
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
