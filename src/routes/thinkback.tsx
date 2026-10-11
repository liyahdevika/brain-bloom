import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCw,
  Pencil,
  Brain,
} from "lucide-react";
import { AppShell, Card, btn } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { isGenuineReflection, MIN_REFLECTION_WORDS, XP_PER_REFLECTION } from "@/lib/xp";
import { evaluateThinkBack } from "@/lib/ai/server";
import type { ThinkBackEvaluation } from "@/lib/ai/types";

export const Route = createFileRoute("/thinkback")({
  head: () => ({
    meta: [
      { title: "ThinkBack Challenge — BrainBloom" },
      {
        name: "description",
        content: "Explain what you learned in your own words and receive AI pedagogical evaluation.",
      },
      { property: "og:title", content: "ThinkBack Challenge — BrainBloom" },
      {
        name: "property:og:description",
        content: "Explain what you learned in your own words and receive AI pedagogical evaluation.",
      },
    ],
  }),
  component: ThinkBack,
});

export const SCALE = ["Lost", "Shaky", "Getting there", "Solid", "Could teach it"];

export function getScoreBadgeStyle(score: number): string {
  if (score >= 4) {
    return "bg-emerald-100 text-emerald-900 border border-emerald-300/50 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800";
  }
  if (score === 3) {
    return "bg-blue-100 text-blue-900 border border-blue-300/50 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800";
  }
  return "bg-amber-100 text-amber-900 border border-amber-300/50 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800";
}

function ThinkBack() {
  const { addReflection, reflections } = useStore();
  const [topic, setTopic] = useState("");
  const [learned, setLearned] = useState("");
  const [explain, setExplain] = useState("");

  // AI Evaluation states
  const [evaluation, setEvaluation] = useState<ThinkBackEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const [result, setResult] = useState<null | boolean>(null);

  const wc = (learned + " " + explain).trim().split(/\s+/).filter(Boolean).length;
  const genuine = isGenuineReflection({ learned, explain });

  // Call the server function to evaluate the unassisted explanation
  const handleEvaluate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!genuine || isEvaluating) return;

    setIsEvaluating(true);
    setEvaluationError(null);

    try {
      const res = await evaluateThinkBack({
        data: {
          topic: topic.trim() || "Untitled Study Concept",
          learned: learned.trim(),
          explain: explain.trim(),
        },
      });

      if (res.success && res.evaluation) {
        setEvaluation(res.evaluation);
      } else {
        setEvaluationError(
          res.errorMessage || "Could not complete evaluation. Please try again.",
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEvaluationError(`Evaluation service error: ${msg}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Save the reflection and AI evaluation to store
  const handleSave = () => {
    if (!genuine) return;

    const assignedScore = evaluation ? evaluation.score : 3;
    const assignedLabel = evaluation ? evaluation.label : "Solid";

    addReflection({
      topic: topic.trim() || "Untitled",
      learned: learned.trim(),
      explain: explain.trim(),
      selfScore: assignedScore,
      aiScore: assignedScore,
      aiLabel: assignedLabel,
      strengths: evaluation?.strengths,
      gaps: evaluation?.gaps,
      followup: evaluation?.followup,
    });

    setResult(true);
    setTopic("");
    setLearned("");
    setExplain("");
    setEvaluation(null);
    setEvaluationError(null);
  };

  return (
    <AppShell
      title="ThinkBack Challenge"
      subtitle="Close your notes. Explain it in your own words — evaluated by AI."
    >
      {result !== null && (
        <Card className="mb-5 bg-secondary">
          <p className="font-semibold text-sage-deep">
            {result
              ? `Reflection saved with AI score — +${XP_PER_REFLECTION} XP earned! 🌿`
              : `Reflection saved. Write at least ${MIN_REFLECTION_WORDS} words across both answers to earn XP.`}
          </p>
          <div className="mt-2 flex gap-4 text-sm font-bold">
            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-muted-foreground hover:underline"
            >
              Dismiss
            </button>
            <Link to="/rewards" className="text-primary hover:underline">
              See rewards →
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <form onSubmit={handleEvaluate} className="space-y-4">
              <Field label="Topic">
                <input
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (evaluation) setEvaluation(null);
                  }}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. Photosynthesis, Binary Search, Newton's Third Law"
                  maxLength={80}
                  disabled={isEvaluating}
                />
              </Field>

              <Field label="What did I learn?">
                <textarea
                  required
                  value={learned}
                  onChange={(e) => {
                    setLearned(e.target.value);
                    if (evaluation) setEvaluation(null);
                  }}
                  rows={3}
                  className="w-full rounded-xl border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Briefly state the core concept you studied…"
                  disabled={isEvaluating}
                />
              </Field>

              <Field label="Can I explain it without my notes?">
                <textarea
                  required
                  value={explain}
                  onChange={(e) => {
                    setExplain(e.target.value);
                    if (evaluation) setEvaluation(null);
                  }}
                  rows={5}
                  className="w-full rounded-xl border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Explain step-by-step in your own words, as if teaching a classmate. Explain the why and how…"
                  disabled={isEvaluating}
                />
              </Field>

              {/* Word Count Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
                <span
                  className={`text-xs font-semibold ${
                    genuine ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {wc}/{MIN_REFLECTION_WORDS} words {genuine ? "✓ Minimum met (earns 15 XP)" : "• Minimum 20 words across both answers"}
                </span>

                {!evaluation && (
                  <button
                    type="submit"
                    disabled={!genuine || isEvaluating}
                    className={`${btn.primary} flex items-center gap-2`}
                  >
                    {isEvaluating ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin" /> Evaluating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Evaluate with ThinkBack AI
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </Card>

          {/* Loading State */}
          {isEvaluating && (
            <Card className="border-lavender/50 bg-lavender/10 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2.5 py-4">
                <Brain className="h-6 w-6 animate-bounce text-primary" />
                <span className="font-display text-base font-bold text-sage-deep">
                  ThinkBack AI is evaluating your explanation…
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Assessing conceptual accuracy, causal step-by-step reasoning, and terminology.
              </p>
            </Card>
          )}

          {/* Error State with Retry Button */}
          {evaluationError && !isEvaluating && (
            <Card className="border-destructive/30 bg-destructive/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-destructive">Evaluation couldn't be completed</p>
                  <p className="mt-1 text-xs text-destructive/80">{evaluationError}</p>
                  <button
                    type="button"
                    onClick={() => handleEvaluate()}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-destructive px-3.5 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90"
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Retry evaluation
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* AI Evaluation Card */}
          {evaluation && !isEvaluating && (
            <Card className="border-2 border-primary/20 bg-card shadow-sm space-y-4">
              {/* Header with Score Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    ThinkBack AI Evaluation
                  </span>
                  <div className="mt-1 flex items-center gap-2.5">
                    <span className="font-display text-3xl font-black text-sage-deep">
                      {evaluation.score} <span className="text-base font-medium text-muted-foreground">/ 5</span>
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-xs ${getScoreBadgeStyle(
                        evaluation.score,
                      )}`}
                    >
                      {evaluation.label}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEvaluation(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" /> Revise explanation
                </button>
              </div>

              {/* Encouraging Summary Message */}
              {evaluation.summaryMessage && (
                <p className="rounded-xl bg-muted/60 p-3 text-xs italic font-medium text-foreground/90 leading-relaxed">
                  "{evaluation.summaryMessage}"
                </p>
              )}

              {/* Strengths */}
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  What you understood well (Strengths)
                </h4>
                <ul className="mt-2 space-y-1.5 pl-1">
                  {evaluation.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps */}
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Areas to strengthen (Gaps)
                </h4>
                <ul className="mt-2 space-y-1.5 pl-1">
                  {evaluation.gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Follow-up Challenge Question */}
              <div className="rounded-2xl border border-primary/20 bg-hero/70 p-3.5">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <HelpCircle className="h-4 w-4 text-primary" /> Follow-Up Challenge
                </h4>
                <p className="mt-1.5 text-xs font-semibold text-sage-deep leading-relaxed">
                  {evaluation.followup}
                </p>
              </div>

              {/* Save Reflection Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
                <span className="text-xs text-muted-foreground font-medium">
                  Lock in your progress and earn XP:
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  className={`${btn.primary} shadow-sm`}
                >
                  Save reflection (+15 XP) 🌿
                </button>
              </div>
            </Card>
          )}
        </div>

        {/* Past Reflections Column */}
        <Card className="h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-sage-deep">Past reflections</h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {reflections.length} logged
            </span>
          </div>

          <ul className="mt-3.5 space-y-3">
            {reflections.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No reflections logged yet. Explain your first topic to see your AI score!
              </li>
            )}
            {reflections.slice(0, 8).map((r) => {
              const score = r.aiScore ?? r.selfScore ?? 3;
              const label = r.aiLabel ?? (SCALE[score - 1] || "Solid");
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-border/40 bg-muted/60 p-3 text-xs space-y-2 transition-all hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sage-deep truncate text-sm">
                      {r.topic}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${getScoreBadgeStyle(
                        score,
                      )}`}
                    >
                      {score}/5 • {label}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-muted-foreground leading-relaxed">
                    {r.explain || r.learned}
                  </p>

                  {/* Expandable details if strengths or gaps exist */}
                  {(r.strengths?.length || r.gaps?.length || r.followup) && (
                    <details className="text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                      <summary className="cursor-pointer font-semibold hover:text-foreground">
                        View AI Feedback Details
                      </summary>
                      <div className="mt-2 space-y-2 pl-1">
                        {r.strengths && r.strengths.length > 0 && (
                          <div>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              Strengths:
                            </span>
                            <p className="text-[11px] text-foreground/80 mt-0.5">
                              {r.strengths.join(", ")}
                            </p>
                          </div>
                        )}
                        {r.gaps && r.gaps.length > 0 && (
                          <div>
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              Gaps:
                            </span>
                            <p className="text-[11px] text-foreground/80 mt-0.5">
                              {r.gaps.join(", ")}
                            </p>
                          </div>
                        )}
                        {r.followup && (
                          <div>
                            <span className="font-bold text-primary">Follow-up:</span>
                            <p className="text-[11px] italic text-foreground/80 mt-0.5">
                              "{r.followup}"
                            </p>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-sage-deep">{label}</span>
      {children}
    </label>
  );
}
