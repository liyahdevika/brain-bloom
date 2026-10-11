import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { AppShell, Card, Stat } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/xp";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — BrainBloom" },
      {
        name: "description",
        content: "Focused minutes, completed goals, weekly activity and reflection history.",
      },
      { property: "og:title", content: "Progress — BrainBloom" },
      {
        property: "og:description",
        content: "Focused minutes, completed goals, weekly activity and reflection history.",
      },
    ],
  }),
  component: Progress,
});

function Progress() {
  const { sessions, goals, reflections } = useStore();
  const hydrated = useHydrated();
  const days = hydrated
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const k = d.toISOString().slice(0, 10);
        return {
          label: d.toLocaleDateString(undefined, { weekday: "short" }),
          min: sessions.filter((s) => dayKey(s.date) === k).reduce((a, b) => a + b.minutes, 0),
          goals: goals.filter((g) => g.completedAt && dayKey(g.completedAt) === k).length,
        };
      })
    : [];
  const max = Math.max(30, ...days.map((d) => d.min));
  const totalMin = sessions.reduce((a, b) => a + b.minutes, 0);
  const avgFocus = sessions
    .filter((s) => s.focusRating)
    .reduce((a, b, _, arr) => a + (b.focusRating ?? 0) / arr.length, 0);

  return (
    <AppShell title="Progress" subtitle="See how your focus and thinking are growing.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Focused minutes" value={totalMin} />
        <Stat label="Sessions" value={sessions.length} />
        <Stat label="Goals completed" value={goals.filter((g) => g.done).length} />
        <Stat
          label="Avg focus"
          value={avgFocus ? avgFocus.toFixed(1) : "–"}
          hint="self-rated / 5"
        />
      </div>
      <Card className="mt-5">
        <h3 className="text-xl font-semibold">Weekly activity</h3>
        <div className="mt-5 flex h-48 items-end gap-2 sm:gap-4">
          {days.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">{d.min || ""}</span>
              <div
                className="w-full rounded-t-xl bg-sage-gradient transition-all"
                style={{ height: `${(d.min / max) * 140}px`, minHeight: 4 }}
              />
              <span className="text-xs font-bold">{d.label}</span>
              <span className="text-[10px] text-accent-foreground">
                {d.goals ? `${d.goals} goal${d.goals > 1 ? "s" : ""}` : ""}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Bars show focused minutes per day.</p>
      </Card>
      <Card className="mt-5">
        <h3 className="text-xl font-semibold">Reflection history</h3>
        <ul className="mt-3 divide-y">
          {reflections.length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">No reflections yet.</li>
          )}
          {reflections.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <div className="flex shrink-0 gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-6 w-1.5 rounded-full ${n <= (r.aiScore ?? r.selfScore ?? 3) ? "bg-lavender" : "bg-muted"}`}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{r.topic}</p>
                <p className="truncate text-sm text-muted-foreground">{r.explain}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {hydrated ? new Date(r.date).toLocaleDateString() : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
