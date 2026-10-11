import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, btn } from "@/components/AppShell";
import { Plant } from "@/components/Plant";
import { useStore } from "@/lib/store";
import { XP_PER_GOAL } from "@/lib/xp";
import { Plus, Trash2, Check } from "lucide-react";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Goal Garden — BrainBloom" },
      {
        name: "description",
        content: "Add study goals and watch your plant grow as you complete them.",
      },
      { property: "og:title", content: "Goal Garden — BrainBloom" },
      {
        property: "og:description",
        content: "Add study goals and watch your plant grow as you complete them.",
      },
    ],
  }),
  component: Goals,
});

function Goals() {
  const { goals, addGoal, toggleGoal, removeGoal } = useStore();
  const [title, setTitle] = useState("");
  const done = goals.filter((g) => g.done);
  const pending = goals.filter((g) => !g.done);
  const stage = done.length % 6 === 0 && done.length > 0 ? 5 : done.length % 6;
  const fullPlants = Math.floor(done.length / 5);

  return (
    <AppShell
      title="Goal Garden"
      subtitle={`Every completed goal earns ${XP_PER_GOAL} XP and helps your plant grow.`}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card className="flex flex-col items-center bg-hero text-center">
          <Plant
            stage={Math.min(5, done.length - fullPlants * 5 || (fullPlants ? 5 : 0))}
            className="h-56 w-56"
          />
          <p className="font-display text-xl font-semibold text-sage-deep">
            {done.length === 0
              ? "A seed is waiting"
              : stage >= 5
                ? "In full bloom!"
                : "Growing nicely"}
          </p>
          <p className="text-sm text-muted-foreground">
            {done.length} goals completed · {fullPlants} plants bloomed
          </p>
        </Card>
        <div className="space-y-5">
          <Card>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim()) {
                  addGoal(title.trim());
                  setTitle("");
                }
              }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a study goal…"
                className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2.5"
                maxLength={120}
              />
              <button className={btn.primary} aria-label="Add goal">
                <Plus className="h-5 w-5" />
              </button>
            </form>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold">Pending ({pending.length})</h3>
            <GoalList items={pending} onToggle={toggleGoal} onRemove={removeGoal} />
          </Card>
          <Card>
            <h3 className="text-lg font-semibold">Completed ({done.length})</h3>
            <GoalList items={done} onToggle={toggleGoal} onRemove={removeGoal} />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function GoalList({
  items,
  onToggle,
  onRemove,
}: {
  items: { id: string; title: string; done: boolean }[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!items.length) return <p className="mt-2 text-sm text-muted-foreground">Nothing here yet.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {items.map((g) => (
        <li key={g.id} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
          <button
            onClick={() => onToggle(g.id)}
            aria-label={g.done ? "Mark pending" : "Mark complete"}
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-primary ${g.done ? "bg-primary" : ""}`}
          >
            {g.done && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
          </button>
          <span
            className={`min-w-0 flex-1 truncate ${g.done ? "text-muted-foreground line-through" : ""}`}
          >
            {g.title}
          </span>
          <button
            onClick={() => onRemove(g.id)}
            aria-label="Delete goal"
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
