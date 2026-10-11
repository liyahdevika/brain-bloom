import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, Stat, btn } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { computeStreak, computeXp, dayKey, levelFor } from "@/lib/xp";
import { Play, Check } from "lucide-react";
import { useHydrated } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BrainBloom" },
      { name: "description", content: "Today's goals, focus time, XP and streak at a glance." },
      { property: "og:title", content: "Dashboard — BrainBloom" },
      {
        property: "og:description",
        content: "Today's goals, focus time, XP and streak at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useStore();
  const hydrated = useHydrated();
  const today = hydrated ? new Date().toISOString().slice(0, 10) : "";
  const xp = computeXp(s.goals, s.reflections);
  const streak = hydrated
    ? computeStreak([...s.sessions.map((x) => x.date), ...s.reflections.map((r) => r.date)])
    : 0;
  const todayMin = s.sessions
    .filter((x) => dayKey(x.date) === today)
    .reduce((a, b) => a + b.minutes, 0);
  const pending = s.goals.filter((g) => !g.done);
  const hour = hydrated ? new Date().getHours() : 12;
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const done = s.goals.filter((g) => g.done).length;

  return (
    <AppShell title={`${greet} 🌱`} subtitle="Ready to grow a little today?">
      <Card className="mb-5 flex flex-col items-start gap-4 bg-hero sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-sage-deep">Time to focus</h2>
          <p className="text-muted-foreground">Clear your space, pick a duration and dive in.</p>
        </div>
        <Link to="/focus" className={btn.primary}>
          <Play className="h-5 w-5" /> Start Focus Session
        </Link>
      </Card>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Focus today" value={`${todayMin}m`} />
        <Stat label="XP" value={xp} hint={`Level ${levelFor(xp)}`} />
        <Stat label="Streak" value={streak} hint="days in a row" />
        <Stat label="Goals done" value={`${done}/${s.goals.length}`} />
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Today's goals</h3>
            <Link to="/goals" className="text-sm font-bold text-primary">
              Garden →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {pending.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No pending goals. Add one in the Goal Garden.
              </li>
            )}
            {pending.slice(0, 5).map((g) => (
              <li key={g.id} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
                <button
                  aria-label="Complete goal"
                  onClick={() => s.toggleGoal(g.id)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-primary hover:bg-secondary"
                >
                  <Check className="h-3.5 w-3.5 text-primary opacity-0 hover:opacity-100" />
                </button>
                <span className="min-w-0 truncate">{g.title}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Progress summary</h3>
          <div className="mt-4 space-y-4 text-sm">
            <Bar label="Level progress" value={xp % 100} max={100} />
            <Bar label="Goals completed" value={done} max={Math.max(1, s.goals.length)} />
            <Bar label="Reflections this week" value={s.reflections.length} max={7} />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between font-semibold">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1 h-2.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-sage-gradient transition-all"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}
