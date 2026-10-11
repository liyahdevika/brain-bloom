import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, btn } from "@/components/AppShell";
import { DemoTag } from "@/components/AiNotice";
import { useStudy } from "@/lib/study";
import { Plus, Trash2, BookOpen, FileUp } from "lucide-react";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Study Library — BrainBloom" },
      {
        name: "description",
        content: "Organise subjects, topics, notes, flashcard decks and quizzes in one place.",
      },
      { property: "og:title", content: "Study Library — BrainBloom" },
      {
        property: "og:description",
        content: "Organise subjects, topics, notes, flashcard decks and quizzes in one place.",
      },
    ],
  }),
  component: Library,
});

function Library() {
  const s = useStudy();
  const [name, setName] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const subject = s.subjects.find((x) => x.id === sel) ?? s.subjects[0];
  const [topicName, setTopicName] = useState("");
  const [deckName, setDeckName] = useState("");
  const topics = s.topics.filter((t) => t.subjectId === subject?.id);
  const decks = s.decks.filter((d) => d.subjectId === subject?.id);
  const quizzes = s.quizzes.filter((q) => q.subjectId === subject?.id);

  return (
    <AppShell
      title="Study Library"
      subtitle="Everything you're learning, organised by subject. Saved in this browser only."
    >
      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <Card className="h-fit">
          <h3 className="font-semibold">Subjects</h3>
          <ul className="mt-2 space-y-1">
            {s.subjects.map((x) => (
              <li key={x.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSel(x.id)}
                  className={`min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-left text-sm font-bold ${subject?.id === x.id ? "bg-secondary text-sage-deep" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {x.name} {x.demo && <DemoTag />}
                </button>
                <button
                  aria-label="Delete subject"
                  onClick={() => s.removeSubject(x.id)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) {
                s.addSubject(name.trim());
                setName("");
              }
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New subject"
              className="min-w-0 flex-1 rounded-full border bg-background px-3 py-2 text-sm"
            />
            <button className={btn.soft} aria-label="Add subject">
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-4 border-t pt-3">
            <Link
              to="/import"
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <FileUp className="h-3.5 w-3.5" /> Smart Import materials →
            </Link>
          </div>
        </Card>

        {!subject ? (
          <Card>
            <p className="text-muted-foreground">Add a subject to start your library.</p>
          </Card>
        ) : (
          <div className="space-y-5">
            <Card>
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <BookOpen className="h-5 w-5 text-primary" /> Topics & notes
              </h3>
              <div className="mt-3 space-y-3">
                {topics.length === 0 && (
                  <p className="text-sm text-muted-foreground">No topics yet.</p>
                )}
                {topics.map((t) => (
                  <div key={t.id} className="rounded-xl bg-muted p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {t.name} {t.demo && <DemoTag />}
                      </span>
                      <button
                        aria-label="Delete topic"
                        onClick={() => s.removeTopic(t.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={t.notes}
                      onChange={(e) => s.updateTopic(t.id, e.target.value)}
                      rows={3}
                      placeholder="Notes…"
                      className="mt-2 w-full rounded-lg border bg-background p-2 text-sm"
                    />
                  </div>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (topicName.trim()) {
                    s.addTopic(subject.id, topicName.trim(), "");
                    setTopicName("");
                  }
                }}
              >
                <input
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="New topic"
                  className="min-w-0 flex-1 rounded-full border bg-background px-3 py-2 text-sm"
                />
                <button className={btn.soft}>
                  <Plus className="h-4 w-4" /> Topic
                </button>
              </form>
            </Card>
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <h3 className="text-lg font-semibold">Flashcard decks</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {decks.map((d) => (
                    <li key={d.id} className="rounded-xl bg-muted px-3 py-2 font-semibold">
                      {d.name} · {s.cards.filter((c) => c.deckId === d.id).length} cards
                    </li>
                  ))}
                  {decks.length === 0 && <li className="text-muted-foreground">None yet.</li>}
                </ul>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (deckName.trim()) {
                      s.addDeck(deckName.trim(), subject.id);
                      setDeckName("");
                    }
                  }}
                >
                  <input
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder="New deck"
                    className="min-w-0 flex-1 rounded-full border bg-background px-3 py-2 text-sm"
                  />
                  <button className={btn.soft} aria-label="Add deck">
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
                <Link to="/flashcards" className="mt-3 inline-block text-sm font-bold text-primary">
                  Open flashcards →
                </Link>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold">Quizzes</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {quizzes.map((q) => (
                    <li key={q.id} className="rounded-xl bg-muted px-3 py-2 font-semibold">
                      {q.title} {q.source === "demo" && <DemoTag />}
                    </li>
                  ))}
                  {quizzes.length === 0 && <li className="text-muted-foreground">None yet.</li>}
                </ul>
                <Link to="/quizzes" className="mt-3 inline-block text-sm font-bold text-primary">
                  Open quizzes →
                </Link>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
