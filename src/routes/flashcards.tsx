import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, btn } from "@/components/AppShell";
import { AiNotice, DemoTag } from "@/components/AiNotice";
import { reviewQueue, useStudy, type Difficulty } from "@/lib/study";
import { Plus, Trash2, RotateCw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Smart Flashcards — BrainBloom" },
      {
        name: "description",
        content: "Create flashcards, flip them, rate difficulty and review the hard ones again.",
      },
      { property: "og:title", content: "Smart Flashcards — BrainBloom" },
      {
        property: "og:description",
        content: "Create flashcards, flip them, rate difficulty and review the hard ones again.",
      },
    ],
  }),
  component: Flashcards,
});

function Flashcards() {
  const s = useStudy();
  const [deckId, setDeckId] = useState(s.decks[0]?.id ?? "");
  const deck = s.decks.find((d) => d.id === deckId) ?? s.decks[0];
  const cards = s.cards.filter((c) => c.deckId === deck?.id);
  const [newDeck, setNewDeck] = useState("");
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [mode, setMode] = useState<null | "all" | "hard">(null);
  const [notes, setNotes] = useState("");
  const [askedAi, setAskedAi] = useState(false);

  return (
    <AppShell
      title="Smart Flashcards"
      subtitle="Say your answer out loud before flipping — active recall beats re-reading."
    >
      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <Card className="h-fit">
          <h3 className="font-semibold">Decks</h3>
          <ul className="mt-2 space-y-1">
            {s.decks.map((d) => (
              <li key={d.id} className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setDeckId(d.id);
                    setMode(null);
                  }}
                  className={`min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-left text-sm font-bold ${deck?.id === d.id ? "bg-secondary text-sage-deep" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {d.name} {d.demo && <DemoTag />}
                </button>
                <button
                  aria-label="Delete deck"
                  onClick={() => s.removeDeck(d.id)}
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
              if (newDeck.trim()) {
                setDeckId(s.addDeck(newDeck.trim()));
                setNewDeck("");
              }
            }}
          >
            <input
              value={newDeck}
              onChange={(e) => setNewDeck(e.target.value)}
              placeholder="New deck"
              className="min-w-0 flex-1 rounded-full border bg-background px-3 py-2 text-sm"
            />
            <button className={btn.soft} aria-label="Add deck">
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </Card>

        <div className="space-y-5">
          {!deck ? (
            <Card>
              <p className="text-muted-foreground">Create a deck to get started.</p>
            </Card>
          ) : mode ? (
            <Review deckCards={cards} hardOnly={mode === "hard"} onDone={() => setMode(null)} />
          ) : (
            <>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">
                    {deck.name}{" "}
                    <span className="text-sm text-muted-foreground">({cards.length} cards)</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={btn.primary}
                      disabled={!reviewQueue(cards).length}
                      onClick={() => setMode("all")}
                    >
                      Review
                    </button>
                    <button
                      className={btn.lav}
                      disabled={!reviewQueue(cards, true).length}
                      onClick={() => setMode("hard")}
                    >
                      Hard cards ({cards.filter((c) => c.difficulty === "hard").length})
                    </button>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {cards.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold">{c.q}</span>
                      {c.difficulty && (
                        <span className="shrink-0 text-xs capitalize text-accent-foreground">
                          {c.difficulty}
                        </span>
                      )}
                      <button
                        aria-label="Delete card"
                        onClick={() => s.removeCard(c.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (q.trim() && a.trim()) {
                      s.addCard(deck.id, q.trim(), a.trim());
                      setQ("");
                      setA("");
                    }
                  }}
                >
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Question"
                    className="rounded-xl border bg-background px-3 py-2"
                  />
                  <input
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                    placeholder="Answer"
                    className="rounded-xl border bg-background px-3 py-2"
                  />
                  <button className={btn.soft}>
                    <Plus className="h-4 w-4" /> Add card
                  </button>
                </form>
              </Card>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    <Sparkles className="h-5 w-5 text-lavender" /> AI Flashcard Generator
                  </h3>
                  <Link to="/import" className="text-xs font-bold text-primary hover:underline">
                    Or Smart Import PDF/PPT/Video →
                  </Link>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Paste your notes here…"
                  className="mt-3 w-full rounded-xl border bg-background p-3"
                />
                <button
                  className={`${btn.lav} mt-3`}
                  disabled={!notes.trim()}
                  onClick={() => setAskedAi(true)}
                >
                  Generate flashcards
                </button>
                {askedAi && (
                  <div className="mt-3">
                    <AiNotice feature="Generating flashcards from notes" />
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Review({
  deckCards,
  hardOnly,
  onDone,
}: {
  deckCards: ReturnType<typeof useStudy>["cards"];
  hardOnly: boolean;
  onDone: () => void;
}) {
  const { rateCard } = useStudy();
  const [queue] = useState(() => reviewQueue(deckCards, hardOnly).map((c) => c.id));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [guess, setGuess] = useState("");
  const card = deckCards.find((c) => c.id === queue[i]);

  if (!card) {
    return (
      <Card className="text-center">
        <p className="font-display text-2xl text-sage-deep">Review complete 🌿</p>
        <button className={`${btn.primary} mt-4`} onClick={onDone}>
          Back to deck
        </button>
      </Card>
    );
  }
  const rate = (d: Difficulty) => {
    rateCard(card.id, d);
    setFlipped(false);
    setGuess("");
    setI(i + 1);
  };

  return (
    <Card>
      <p className="text-sm font-semibold text-muted-foreground">
        Card {i + 1} of {queue.length}
        {hardOnly && " · hard cards"}
      </p>
      <button
        onClick={() => setFlipped(!flipped)}
        className={`mt-3 grid min-h-48 w-full place-items-center rounded-2xl p-6 text-center text-xl font-semibold transition ${flipped ? "bg-accent text-accent-foreground" : "bg-hero text-sage-deep"}`}
      >
        {flipped ? card.a : card.q}
        <span className="mt-2 flex items-center gap-1 text-xs font-bold opacity-70">
          <RotateCw className="h-3 w-3" /> tap to flip
        </span>
      </button>
      {!flipped ? (
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="ThinkBack: type your answer before flipping (optional)"
          className="mt-3 w-full rounded-xl border bg-background px-3 py-2 text-sm"
        />
      ) : (
        <>
          {guess && (
            <p className="mt-3 rounded-xl bg-muted p-3 text-sm">
              <strong>You said:</strong> {guess}
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button className={btn.soft} onClick={() => rate("easy")}>
              Easy
            </button>
            <button className={btn.soft} onClick={() => rate("medium")}>
              Medium
            </button>
            <button className={btn.lav} onClick={() => rate("hard")}>
              Hard
            </button>
          </div>
        </>
      )}
      <button onClick={onDone} className="mt-4 text-sm font-bold text-muted-foreground">
        Exit review
      </button>
    </Card>
  );
}
