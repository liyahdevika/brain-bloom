import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, btn } from "@/components/AppShell";
import { AiNotice, DemoTag } from "@/components/AiNotice";
import { scoreQuiz, useStudy, type Quiz } from "@/lib/study";
import { Plus, Trash2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/quizzes")({
  head: () => ({
    meta: [
      { title: "Quizzes — BrainBloom" },
      {
        name: "description",
        content: "Topic quizzes with multiple choice, scores and answer explanations.",
      },
      { property: "og:title", content: "Quizzes — BrainBloom" },
      {
        property: "og:description",
        content: "Topic quizzes with multiple choice, scores and answer explanations.",
      },
    ],
  }),
  component: Quizzes,
});

function Quizzes() {
  const s = useStudy();
  const [active, setActive] = useState<Quiz | null>(null);
  const [topic, setTopic] = useState("");
  const [askedAi, setAskedAi] = useState(false);
  const [building, setBuilding] = useState(false);

  if (active)
    return (
      <AppShell title={active.title}>
        <TakeQuiz quiz={active} onExit={() => setActive(null)} />
      </AppShell>
    );

  return (
    <AppShell title="Quizzes" subtitle="Test yourself, then read why each answer is right.">
      <div className="grid gap-5 md:grid-cols-2">
        {s.quizzes.map((qz) => {
          const tries = s.attempts.filter((a) => a.quizId === qz.id);
          const best = tries.reduce((m, a) => Math.max(m, a.score), 0);
          return (
            <Card key={qz.id}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{qz.title}</h3>
                {qz.source === "demo" ? (
                  <DemoTag />
                ) : (
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Made by you
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {qz.questions.length} questions ·{" "}
                {tries.length
                  ? `best ${best}/${qz.questions.length} · ${tries.length} tries`
                  : "not taken yet"}
              </p>
              <div className="mt-4 flex gap-2">
                <button className={btn.primary} onClick={() => setActive(qz)}>
                  Start quiz
                </button>
                <button
                  aria-label="Delete quiz"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => s.removeQuiz(qz.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <Sparkles className="h-5 w-5 text-lavender" /> AI Quiz Generator
            </h3>
            <Link to="/import" className="text-xs font-bold text-primary hover:underline">
              Or Import from PDF/PPT/Video →
            </Link>
          </div>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic, e.g. The French Revolution"
            className="mt-3 w-full rounded-xl border bg-background px-3 py-2"
          />
          <button
            className={`${btn.lav} mt-3`}
            disabled={!topic.trim()}
            onClick={() => setAskedAi(true)}
          >
            Generate quiz
          </button>
          {askedAi && (
            <div className="mt-3">
              <AiNotice feature="Generating quizzes" />
            </div>
          )}
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Make your own quiz</h3>
          {building ? (
            <QuizBuilder onDone={() => setBuilding(false)} />
          ) : (
            <button className={`${btn.soft} mt-3`} onClick={() => setBuilding(true)}>
              <Plus className="h-4 w-4" /> New quiz
            </button>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function TakeQuiz({ quiz, onExit }: { quiz: Quiz; onExit: () => void }) {
  const { addAttempt } = useStudy();
  const [answers, setAnswers] = useState<(number | null)[]>(quiz.questions.map(() => null));
  const [reasons, setReasons] = useState<string[]>(quiz.questions.map(() => ""));
  const [done, setDone] = useState(false);
  const score = scoreQuiz(quiz.questions, answers);

  return (
    <div className="space-y-4">
      {quiz.source === "demo" && (
        <p className="text-sm text-accent-foreground">
          <DemoTag /> This is a sample quiz, not AI-generated.
        </p>
      )}
      {quiz.questions.map((q, i) => (
        <Card key={i}>
          <p className="font-semibold">
            {i + 1}. {q.q}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, j) => {
              const picked = answers[i] === j;
              const tone = done
                ? j === q.correct
                  ? "bg-secondary text-sage-deep ring-2 ring-primary"
                  : picked
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted"
                : picked
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-secondary";
              return (
                <button
                  key={j}
                  disabled={done}
                  onClick={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${tone}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {!done && (
            <input
              value={reasons[i]}
              onChange={(e) => setReasons((r) => r.map((x, k) => (k === i ? e.target.value : x)))}
              placeholder="ThinkBack: why do you think so? (optional)"
              className="mt-3 w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
          )}
          {done && (
            <div className="mt-3 space-y-1 rounded-xl bg-muted p-3 text-sm">
              {reasons[i] && (
                <p>
                  <strong>Your reasoning:</strong> {reasons[i]}
                </p>
              )}
              <p>
                <strong>Explanation:</strong> {q.explanation}
              </p>
            </div>
          )}
        </Card>
      ))}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        {done ? (
          <p className="font-display text-2xl text-sage-deep">
            Score: {score}/{quiz.questions.length}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {answers.filter((a) => a !== null).length}/{quiz.questions.length} answered
          </p>
        )}
        <div className="flex gap-2">
          {!done && (
            <button
              className={btn.primary}
              disabled={answers.some((a) => a === null)}
              onClick={() => {
                setDone(true);
                addAttempt(quiz.id, score, quiz.questions.length);
              }}
            >
              Submit
            </button>
          )}
          <button className={btn.soft} onClick={onExit}>
            Back to quizzes
          </button>
        </div>
      </Card>
    </div>
  );
}

function QuizBuilder({ onDone }: { onDone: () => void }) {
  const { addQuiz } = useStudy();
  const [title, setTitle] = useState("");
  const [qs, setQs] = useState([{ q: "", options: ["", "", "", ""], correct: 0, explanation: "" }]);
  const set = (i: number, patch: Partial<(typeof qs)[number]>) =>
    setQs((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const valid = title.trim() && qs.every((q) => q.q.trim() && q.options.every((o) => o.trim()));
  return (
    <div className="mt-3 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quiz title"
        className="w-full rounded-xl border bg-background px-3 py-2"
      />
      {qs.map((q, i) => (
        <div key={i} className="space-y-2 rounded-xl bg-muted p-3">
          <input
            value={q.q}
            onChange={(e) => set(i, { q: e.target.value })}
            placeholder={`Question ${i + 1}`}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          {q.options.map((o, j) => (
            <label key={j} className="flex items-center gap-2">
              <input
                type="radio"
                name={`c${i}`}
                checked={q.correct === j}
                onChange={() => set(i, { correct: j })}
                className="accent-primary"
                aria-label="Correct answer"
              />
              <input
                value={o}
                onChange={(e) =>
                  set(i, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })
                }
                placeholder={`Option ${j + 1}`}
                className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm"
              />
            </label>
          ))}
          <input
            value={q.explanation}
            onChange={(e) => set(i, { explanation: e.target.value })}
            placeholder="Explanation"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Pick the circle next to the correct option.</p>
      <div className="flex flex-wrap gap-2">
        <button
          className={btn.soft}
          onClick={() =>
            setQs((l) => [...l, { q: "", options: ["", "", "", ""], correct: 0, explanation: "" }])
          }
        >
          + Question
        </button>
        <button
          className={btn.primary}
          disabled={!valid}
          onClick={() => {
            addQuiz({ title: title.trim(), questions: qs, source: "manual" });
            onDone();
          }}
        >
          Save quiz
        </button>
      </div>
    </div>
  );
}
