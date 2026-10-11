import { createFileRoute } from "@tanstack/react-router";
import { useHydrated } from "@tanstack/react-router";
import { AppShell, Card, Stat } from "@/components/AppShell";
import { Plant } from "@/components/Plant";
import { useStore } from "@/lib/store";
import {
  computeStreak,
  computeXp,
  isGenuineReflection,
  levelFor,
  XP_PER_GOAL,
  XP_PER_REFLECTION,
} from "@/lib/xp";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — BrainBloom" },
      {
        name: "description",
        content: "XP, badges, streaks, milestones and the plants you've grown.",
      },
      { property: "og:title", content: "Rewards — BrainBloom" },
      {
        property: "og:description",
        content: "XP, badges, streaks, milestones and the plants you've grown.",
      },
    ],
  }),
  component: Rewards,
});

function Rewards() {
  const { goals, reflections, sessions } = useStore();
  const hydrated = useHydrated();
  const xp = computeXp(goals, reflections);
  const done = goals.filter((g) => g.done).length;
  const genuine = reflections.filter(isGenuineReflection).length;
  const streak = hydrated
    ? computeStreak([...sessions.map((s) => s.date), ...reflections.map((r) => r.date)])
    : 0;
  const badges = [
    { e: "🌱", t: "First Sprout", d: "Complete your first goal", ok: done >= 1 },
    { e: "🧠", t: "Deep Thinker", d: "Write 3 genuine reflections", ok: genuine >= 3 },
    { e: "⭐", t: "Steady Streak", d: "3-day streak", ok: streak >= 3 },
    { e: "🌻", t: "Gardener", d: "Complete 10 goals", ok: done >= 10 },
    {
      e: "🎓",
      t: "Teacher Mode",
      d: "Earn a 'Could teach it' (5/5) AI score",
      ok: reflections.some((r) => (r.aiScore ?? r.selfScore) === 5 && isGenuineReflection(r)),
    },
    { e: "🌳", t: "Level 5", d: "Reach 400 XP", ok: xp >= 400 },
  ];
  const milestones = [100, 250, 500, 1000];

  return (
    <AppShell
      title="Rewards"
      subtitle={`XP comes from completed goals (+${XP_PER_GOAL}) and genuine reflections (+${XP_PER_REFLECTION}) — not from idle timers.`}
    >
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total XP" value={xp} hint={`Level ${levelFor(xp)}`} />
        <Stat label="Streak" value={streak} hint="days in a row" />
        <Stat label="Badges" value={`${badges.filter((b) => b.ok).length}/${badges.length}`} />
      </div>
      <Card className="mt-5">
        <h3 className="text-xl font-semibold">Badges</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.t}
              className={`rounded-2xl p-4 text-center ${b.ok ? "bg-secondary" : "bg-muted opacity-50 grayscale"}`}
            >
              <div className="text-4xl">{b.e}</div>
              <p className="mt-1 font-bold">{b.t}</p>
              <p className="text-xs text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-semibold">Milestones</h3>
          <ul className="mt-3 space-y-3">
            {milestones.map((m) => (
              <li key={m}>
                <div className="flex justify-between text-sm font-semibold">
                  <span>{m} XP</span>
                  <span>{xp >= m ? "Reached ✓" : `${m - xp} to go`}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-sage-gradient"
                    style={{ width: `${Math.min(100, (xp / m) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Your plants</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: Math.floor(done / 5) }).map((_, i) => (
              <Plant key={i} stage={5} className="h-20 w-20" />
            ))}
            <Plant stage={done % 5} className="h-20 w-20" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            A plant blooms every 5 completed goals.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
