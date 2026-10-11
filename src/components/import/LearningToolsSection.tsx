import { useState, useEffect } from "react";
import type {
  ImportedMaterial,
  SupportedLanguage,
  GeneratedLearningKit,
} from "@/lib/extractors/types";
import { SUPPORTED_LANGUAGES } from "@/lib/extractors/types";
import {
  generateLearningKit,
  generateSummary,
  generateSimpleExplanation,
  generateFlashcards,
  generateQuiz,
  generateRevisionNotes,
  generateKeyConcepts,
  generatePracticeQuestions,
  generateStudyPlan,
} from "@/lib/learning-tools";
import { getConnectionStatus } from "@/lib/api-bridge";
import { useStudy } from "@/lib/study";
import { useImport } from "@/lib/import-store";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Lightbulb,
  Layers,
  HelpCircle,
  BookOpen,
  Tag,
  CheckSquare,
  Calendar,
  Sparkles,
  Globe,
  RotateCw,
  Copy,
  Check,
  BookmarkPlus,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from "lucide-react";
import { btn } from "../AppShell";

type Props = {
  material: ImportedMaterial;
};

type ActiveTool =
  | "summary"
  | "explanation"
  | "flashcards"
  | "quiz"
  | "revision"
  | "concepts"
  | "questions"
  | "plan";

export function LearningToolsSection({ material }: Props) {
  const study = useStudy();
  const { learningKits, saveLearningKit, exportToFlashcards, exportToQuizzes } = useImport();

  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [activeTool, setActiveTool] = useState<ActiveTool>("summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Flashcards flip & state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Practice questions reveal state
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  const kit: GeneratedLearningKit | undefined = learningKits[material.id];
  const connStatus = getConnectionStatus();

  // Initialise the kit when the material or language changes (outside render)
  useEffect(() => {
    if (!kit || kit.language !== language) {
      const newKit = generateLearningKit(material.id, material.extractedText, language);
      saveLearningKit(material.id, newKit);
    }
  }, [material.id, material.extractedText, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pure helper – only reads, never writes store state
  const getOrGenerateKit = (): GeneratedLearningKit => {
    if (kit && kit.language === language) return kit;
    return generateLearningKit(material.id, material.extractedText, language);
  };

  const handleGenerateAll = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newKit = generateLearningKit(material.id, material.extractedText, language);
      saveLearningKit(material.id, newKit);
      setIsGenerating(false);
      setQuizAnswers([]);
      setQuizSubmitted(false);
      setCurrentCardIndex(0);
      setCardFlipped(false);
    }, 150);
  };

  const handleToolClick = (tool: ActiveTool) => {
    setActiveTool(tool);
    // Ensure material has study kit generated
    const currentKit = kit?.language === language ? kit : getOrGenerateKit();

    if (tool === "summary" && !currentKit.summary) {
      currentKit.summary = generateSummary(material.extractedText, language);
      saveLearningKit(material.id, currentKit);
    } else if (tool === "explanation" && !currentKit.simpleExplanation) {
      currentKit.simpleExplanation = generateSimpleExplanation(material.extractedText, language);
      saveLearningKit(material.id, currentKit);
    } else if (tool === "flashcards" && !currentKit.flashcards) {
      currentKit.flashcards = generateFlashcards(material.extractedText, language);
      saveLearningKit(material.id, currentKit);
    } else if (tool === "quiz" && !currentKit.quiz) {
      currentKit.quiz = generateQuiz(material.extractedText, language);
      saveLearningKit(material.id, currentKit);
      setQuizAnswers([]);
      setQuizSubmitted(false);
    } else if (tool === "revision" && !currentKit.revisionNotes) {
      currentKit.revisionNotes = generateRevisionNotes(material.extractedText, language);
      saveLearningKit(material.id, currentKit);
    } else if (tool === "concepts" && !currentKit.concepts) {
      currentKit.concepts = generateKeyConcepts(material.extractedText, language);
      saveLearningKit(material.id, currentKit);
    } else if (tool === "questions" && !currentKit.practiceQuestions) {
      currentKit.practiceQuestions = generatePracticeQuestions(material.extractedText, language);
      saveLearningKit(material.id, currentKit);
    } else if (tool === "plan" && !currentKit.studyPlan) {
      currentKit.studyPlan = generateStudyPlan(material.extractedText, language);
      saveLearningKit(material.id, currentKit);
    }
  };

  const activeKit = kit?.language === language ? kit : getOrGenerateKit();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDeck = () => {
    if (!activeKit.flashcards?.length) return;
    const deckName = `${material.title} (${language === "ml" ? "മലയാളം" : "EN"})`;
    exportToFlashcards(deckName, activeKit.flashcards, study);
    setSavedSuccess(`Saved ${activeKit.flashcards.length} cards to your BrainBloom Flashcards!`);
    setTimeout(() => setSavedSuccess(null), 4000);
  };

  const handleSaveQuiz = () => {
    if (!activeKit.quiz?.length) return;
    const quizTitle = `${material.title} Quiz`;
    exportToQuizzes(quizTitle, activeKit.quiz, study);
    setSavedSuccess(`Saved quiz "${quizTitle}" to your BrainBloom Quizzes!`);
    setTimeout(() => setSavedSuccess(null), 4000);
  };

  return (
    <div className="card-soft mt-8 p-6 md:p-8 animate-rise">
      {/* Top Banner: Material Title & Language Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Active Study Material
          </span>
          <h3 className="font-display text-2xl font-bold text-sage-deep">{material.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {material.metadata?.wordCount ||
              material.extractedText.split(/\s+/).filter(Boolean).length}{" "}
            words extracted • Select a tool to generate tailored revision resources.
          </p>
        </div>

        {/* Language selector & Generate All */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-2xl border bg-background px-3 py-1.5 text-xs font-bold shadow-sm">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Language:</span>
            <select
              value={language}
              onChange={(e) => {
                const nextLang = e.target.value as SupportedLanguage;
                setLanguage(nextLang);
                const updated = generateLearningKit(material.id, material.extractedText, nextLang);
                saveLearningKit(material.id, updated);
              }}
              className="bg-transparent font-bold text-sage-deep focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.nativeLabel})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerateAll}
            disabled={isGenerating}
            className={btn.primary}
          >
            <Sparkles className="h-4 w-4" /> {isGenerating ? "Generating..." : "Generate All Tools"}
          </button>

          <Link to="/tutor" search={{ materialId: material.id }} className={btn.lav}>
            <MessageCircle className="h-4 w-4" /> Chat with BloomBuddy
          </Link>
        </div>
      </div>

      {/* Engine status indicator & data honesty pledge */}
      <div className="my-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-secondary bg-secondary/30 px-4 py-2.5 text-xs text-sage-deep">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>
            <strong>Local Educational NLP Engine:</strong> Running 100% on-device in your browser.
            No third-party data tracking, zero API costs.
          </span>
        </div>
        <span className="rounded-full bg-card px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-xs">
          Offline Ready
        </span>
      </div>

      {savedSuccess && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-primary/30 bg-secondary px-4 py-2 text-xs font-bold text-sage-deep">
          <span>🌿 {savedSuccess}</span>
          <button onClick={() => setSavedSuccess(null)} className="text-primary underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 8 Action Buttons Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {[
          { id: "summary", label: "Summarise", icon: FileText },
          { id: "explanation", label: "Simple Explain", icon: Lightbulb },
          { id: "flashcards", label: "Flashcards", icon: Layers },
          { id: "quiz", label: "Quiz", icon: HelpCircle },
          { id: "revision", label: "Revision Notes", icon: BookOpen },
          { id: "concepts", label: "Key Concepts", icon: Tag },
          { id: "questions", label: "Practice Qs", icon: CheckSquare },
          { id: "plan", label: "Study Plan", icon: Calendar },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleToolClick(id as ActiveTool)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-all ${
                isActive
                  ? "border-primary bg-secondary text-sage-deep shadow-sm scale-102"
                  : "border-lavender/40 bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-bold leading-tight">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TOOL 1: SUMMARY */}
      {/* ========================================================= */}
      {activeTool === "summary" && activeKit.summary && (
        <div className="mt-6 space-y-4 rounded-3xl border border-lavender/50 bg-background/50 p-6 animate-rise">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-display text-lg font-bold text-sage-deep">
              <FileText className="h-5 w-5 text-primary" /> Study Summary
            </h4>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `${activeKit.summary?.overview}\n\n${activeKit.summary?.keyPoints.join("\n")}`,
                )
              }
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Summary"}
            </button>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Executive Overview
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
              {activeKit.summary.overview}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Key Highlights
            </p>
            <ul className="space-y-2">
              {activeKit.summary.keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl bg-card p-3 text-sm">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {activeKit.summary.takeaway && (
            <div className="rounded-2xl border border-primary/20 bg-secondary/50 p-4 text-xs font-semibold text-sage-deep">
              {activeKit.summary.takeaway}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 2: SIMPLE EXPLANATION */}
      {/* ========================================================= */}
      {activeTool === "explanation" && activeKit.simpleExplanation && (
        <div className="mt-6 space-y-4 rounded-3xl border border-lavender/50 bg-background/50 p-6 animate-rise">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-display text-lg font-bold text-sage-deep">
              <Lightbulb className="h-5 w-5 text-primary" /> Beginner-Friendly Explanation
            </h4>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <h5 className="font-display text-base font-bold text-sage-deep">
              {activeKit.simpleExplanation.headline}
            </h5>
            <div className="mt-3 space-y-2 text-sm leading-relaxed">
              {activeKit.simpleExplanation.simpleBreakdown.map((item, i) => (
                <p key={i} className="rounded-xl bg-muted/60 p-2.5">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-lavender bg-accent/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-foreground">
              Intuitive Analogy
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {activeKit.simpleExplanation.realWorldAnalogy}
            </p>
          </div>

          <div className="rounded-2xl bg-secondary p-3 text-xs font-bold text-sage-deep">
            {activeKit.simpleExplanation.keyRule}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 3: FLASHCARDS */}
      {/* ========================================================= */}
      {activeTool === "flashcards" && activeKit.flashcards && (
        <div className="mt-6 space-y-5 rounded-3xl border border-lavender/50 bg-background/50 p-6 animate-rise">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="flex items-center gap-2 font-display text-lg font-bold text-sage-deep">
                <Layers className="h-5 w-5 text-primary" /> Generated Flashcards (
                {activeKit.flashcards.length})
              </h4>
              <p className="text-xs text-muted-foreground">
                Say your answer out loud before flipping — active recall builds permanent pathways.
              </p>
            </div>

            <button type="button" onClick={handleSaveDeck} className={btn.primary}>
              <BookmarkPlus className="h-4 w-4" /> Save Deck to BrainBloom
            </button>
          </div>

          {activeKit.flashcards.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No flashcards generated yet. Click Generate All Tools above.
            </p>
          ) : (
            <div>
              {/* Interactive 3D Card */}
              {(() => {
                const card = activeKit.flashcards[currentCardIndex] || activeKit.flashcards[0];
                if (!card) return null;
                return (
                  <div className="mx-auto max-w-xl">
                    <div className="flex items-center justify-between pb-2 text-xs font-bold text-muted-foreground">
                      <span>
                        Card {currentCardIndex + 1} of {activeKit.flashcards.length}
                      </span>
                      <span className="capitalize text-primary">
                        Difficulty: {card.difficulty || "medium"}
                      </span>
                    </div>

                    <div
                      onClick={() => setCardFlipped(!cardFlipped)}
                      className={`relative flex min-h-60 w-full cursor-pointer flex-col items-center justify-center rounded-3xl p-8 text-center shadow-md transition-all duration-300 ${
                        cardFlipped
                          ? "bg-accent text-accent-foreground border border-lavender"
                          : "bg-hero text-sage-deep border border-lavender/40 hover:scale-[1.01]"
                      }`}
                    >
                      <span className="mb-2 text-[10px] font-bold uppercase tracking-wider opacity-70">
                        {cardFlipped ? "Answer" : "Question"}
                      </span>
                      <p className="font-display text-xl font-bold leading-relaxed">
                        {cardFlipped ? card.answer : card.question}
                      </p>
                      <span className="mt-6 flex items-center gap-1 text-xs font-semibold opacity-70">
                        <RotateCw className="h-3 w-3" /> tap card to flip
                      </span>
                    </div>

                    {/* Navigation */}
                    <div className="mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        disabled={currentCardIndex === 0}
                        onClick={() => {
                          setCardFlipped(false);
                          setCurrentCardIndex((i) => Math.max(0, i - 1));
                        }}
                        className={btn.soft}
                      >
                        ← Previous
                      </button>

                      <span className="text-xs font-bold text-muted-foreground">
                        Concept: {card.concept}
                      </span>

                      <button
                        type="button"
                        disabled={currentCardIndex === activeKit.flashcards.length - 1}
                        onClick={() => {
                          setCardFlipped(false);
                          setCurrentCardIndex((i) =>
                            Math.min(activeKit.flashcards!.length - 1, i + 1),
                          );
                        }}
                        className={btn.soft}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 4: QUIZ */}
      {/* ========================================================= */}
      {activeTool === "quiz" && activeKit.quiz && (
        <div className="mt-6 space-y-5 rounded-3xl border border-lavender/50 bg-background/50 p-6 animate-rise">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="flex items-center gap-2 font-display text-lg font-bold text-sage-deep">
                <HelpCircle className="h-5 w-5 text-primary" /> Topic Quiz ({activeKit.quiz.length}{" "}
                Questions)
              </h4>
              <p className="text-xs text-muted-foreground">
                Self-test multiple choice questions with answers and detailed explanations.
              </p>
            </div>

            <button type="button" onClick={handleSaveQuiz} className={btn.primary}>
              <BookmarkPlus className="h-4 w-4" /> Save Quiz to BrainBloom
            </button>
          </div>

          <div className="space-y-4">
            {activeKit.quiz.map((q, qIndex) => {
              const selectedOption = quizAnswers[qIndex];
              return (
                <div key={q.id} className="rounded-2xl border bg-card p-5">
                  <p className="font-display text-base font-bold text-sage-deep">
                    {qIndex + 1}. {q.question}
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oIndex) => {
                      const isPicked = selectedOption === oIndex;
                      let tone = "bg-muted hover:bg-secondary text-foreground";

                      if (quizSubmitted) {
                        if (oIndex === q.correctIndex) {
                          tone = "bg-secondary text-sage-deep ring-2 ring-primary font-bold";
                        } else if (isPicked) {
                          tone = "bg-destructive/10 text-destructive";
                        }
                      } else if (isPicked) {
                        tone = "bg-primary text-primary-foreground font-bold";
                      }

                      return (
                        <button
                          key={oIndex}
                          type="button"
                          disabled={quizSubmitted}
                          onClick={() => {
                            const updated = [...quizAnswers];
                            updated[qIndex] = oIndex;
                            setQuizAnswers(updated);
                          }}
                          className={`rounded-xl px-4 py-3 text-left text-xs font-semibold transition ${tone}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && (
                    <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs">
                      <p className="font-bold text-sage-deep">
                        {selectedOption === q.correctIndex ? "✅ Correct!" : "❌ Incorrect"}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            {quizSubmitted ? (
              <div className="flex items-center gap-4">
                <span className="font-display text-xl font-bold text-sage-deep">
                  Score:{" "}
                  {
                    quizAnswers.filter((ans, idx) => ans === activeKit.quiz?.[idx]?.correctIndex)
                      .length
                  }{" "}
                  / {activeKit.quiz.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setQuizAnswers([]);
                    setQuizSubmitted(false);
                  }}
                  className={btn.soft}
                >
                  Retake Quiz
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={activeKit.quiz.some(
                  (_, i) => quizAnswers[i] === undefined || quizAnswers[i] === null,
                )}
                onClick={() => setQuizSubmitted(true)}
                className={btn.primary}
              >
                Submit Answers & View Explanations
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 5: REVISION NOTES */}
      {/* ========================================================= */}
      {activeTool === "revision" && activeKit.revisionNotes && (
        <div className="mt-6 space-y-4 rounded-3xl border border-lavender/50 bg-background/50 p-6 animate-rise">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-display text-lg font-bold text-sage-deep">
              <BookOpen className="h-5 w-5 text-primary" /> {activeKit.revisionNotes.title}
            </h4>
            <button
              type="button"
              onClick={() => handleCopy(JSON.stringify(activeKit.revisionNotes, null, 2))}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Notes"}
            </button>
          </div>

          {activeKit.revisionNotes.sections.map((sec, idx) => (
            <div key={idx} className="rounded-2xl border bg-card p-4">
              <h5 className="font-display text-sm font-bold text-sage-deep">{sec.heading}</h5>
              <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                {sec.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-2xl border bg-secondary/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-sage-deep">
              Important Formulas & Rules
            </span>
            <ul className="mt-2 space-y-1 text-xs">
              {activeKit.revisionNotes.formulasOrRules.map((r, i) => (
                <li key={i} className="font-mono font-medium text-sage-deep">
                  → {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Exam Readiness Checklist
            </span>
            <ul className="mt-2 space-y-1.5 text-xs">
              {activeKit.revisionNotes.examChecklist.map((c, i) => (
                <li key={i} className="flex items-center gap-2 font-semibold text-foreground">
                  <CheckSquare className="h-3.5 w-3.5 text-primary" /> {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 6: KEY CONCEPTS & KEYWORDS */}
      {/* ========================================================= */}
      {activeTool === "concepts" && activeKit.concepts && (
        <div className="mt-6 space-y-4 rounded-3xl border border-lavender/50 bg-background/50 p-6 animate-rise">
          <h4 className="flex items-center gap-2 font-display text-lg font-bold text-sage-deep">
            <Tag className="h-5 w-5 text-primary" /> Key Concepts & Domain Glossary
          </h4>

          <div className="grid gap-3 sm:grid-cols-2">
            {activeKit.concepts.map((concept, idx) => (
              <div key={idx} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-sage-deep">
                    {concept.term}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {concept.importance}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {concept.definition}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 7: PRACTICE QUESTIONS */}
      {/* ========================================================= */}
      {activeTool === "questions" && activeKit.practiceQuestions && (
        <div className="mt-6 space-y-4 rounded-3xl border border-lavender/50 bg-background/50 p-6 animate-rise">
          <h4 className="flex items-center gap-2 font-display text-lg font-bold text-sage-deep">
            <CheckSquare className="h-5 w-5 text-primary" /> Practice Questions for Active Recall
          </h4>

          <div className="space-y-3">
            {activeKit.practiceQuestions.map((q, idx) => {
              const isRevealed = revealedHints[q.id];
              return (
                <div key={q.id} className="rounded-2xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-sm font-bold text-sage-deep">
                      {idx + 1}. {q.question}
                    </p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      {q.type}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    💡 <em>Hint: {q.hint}</em>
                  </p>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedHints((prev) => ({
                          ...prev,
                          [q.id]: !prev[q.id],
                        }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      {isRevealed ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {isRevealed ? "Hide Sample Answer" : "Reveal Sample Answer"}
                    </button>

                    {isRevealed && (
                      <div className="mt-2 rounded-xl bg-secondary/40 p-3 text-xs leading-relaxed text-sage-deep">
                        <strong>Model Answer:</strong> {q.sampleAnswer}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOOL 8: STUDY PLAN */}
      {/* ========================================================= */}
      {activeTool === "plan" && activeKit.studyPlan && (
        <div className="mt-6 space-y-4 rounded-3xl border border-lavender/50 bg-background/50 p-6 animate-rise">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-display text-lg font-bold text-sage-deep">
              <Calendar className="h-5 w-5 text-primary" /> Spaced Study Plan (
              {activeKit.studyPlan.durationDays} Days)
            </h4>
          </div>

          <p className="text-xs font-semibold text-muted-foreground">
            {activeKit.studyPlan.advice}
          </p>

          <div className="space-y-3">
            {activeKit.studyPlan.schedule.map((day) => (
              <div key={day.day} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-sage-deep">{day.title}</span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary">
                    ~{day.estimatedMinutes} mins
                  </span>
                </div>

                <p className="mt-1 text-xs font-medium text-muted-foreground">{day.focus}</p>

                <ul className="mt-2.5 space-y-1 text-xs text-foreground">
                  {day.tasks.map((task, tIndex) => (
                    <li key={tIndex} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
