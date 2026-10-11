import { describe, expect, it } from "vitest";
import {
  extractYouTubeVideoId,
  buildYouTubeMaterialText,
} from "@/lib/extractors/youtube-extractor";
import { processRawTextInput } from "@/lib/extractors/text-extractor";
import {
  generateSummary,
  generateSimpleExplanation,
  generateFlashcards,
  generateQuiz,
  generateRevisionNotes,
  generateKeyConcepts,
  generatePracticeQuestions,
  generateStudyPlan,
  generateLearningKit,
} from "@/lib/learning-tools";

const SAMPLE_TEXT = `Photosynthesis is the biological process used by plants, algae, and cyanobacteria to convert light energy into chemical energy stored in glucose.

Key Steps in the Process:
1. Light Reactions: Occur inside the thylakoid membranes of chloroplasts. Chlorophyll absorbs sunlight and splits water molecules into hydrogen and oxygen.
2. Calvin Cycle: Occurs in the stroma of chloroplasts. Carbon dioxide is converted into glucose using ATP and NADPH.

Mitochondria: Known as the powerhouse of the cell, mitochondria generate cellular ATP via aerobic respiration.
ATP: The universal chemical energy currency of living cells.`;

describe("Smart Import Extractors", () => {
  it("extracts YouTube video IDs correctly from diverse URL formats", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://invalid-url.com")).toBeNull();
  });

  it("handles YouTube transcript transparently", () => {
    const details = {
      videoId: "dQw4w9WgXcQ",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Sample Biology Lecture",
      authorName: "Khan Academy",
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      metadata: {},
    };

    // When no transcript is provided, it does NOT pretend to have one
    const withoutTranscript = buildYouTubeMaterialText(details);
    expect(withoutTranscript.hasTranscript).toBe(false);
    expect(withoutTranscript.text).toContain("[Transcript Not Loaded");

    // When student pastes transcript, it processes it genuinely
    const withTranscript = buildYouTubeMaterialText(
      details,
      "Photosynthesis takes place in chloroplasts.",
    );
    expect(withTranscript.hasTranscript).toBe(true);
    expect(withTranscript.text).toContain("Photosynthesis takes place");
  });

  it("processes raw text inputs and determines sensible titles", () => {
    const res = processRawTextInput(
      "Operating Systems\nA process is an executing program instance with an address space.",
    );
    expect(res.title).toBe("Operating Systems");
    expect(res.metadata.wordCount).toBeGreaterThan(5);
  });
});

describe("Learning Tools NLP Engine", () => {
  it("generates summaries in English and Malayalam", () => {
    const enSummary = generateSummary(SAMPLE_TEXT, "en");
    expect(enSummary.overview).toContain("Photosynthesis is");
    expect(enSummary.keyPoints.length).toBeGreaterThan(0);

    const mlSummary = generateSummary(SAMPLE_TEXT, "ml");
    expect(mlSummary.overview).toContain("പഠന സാമഗ്രിയുടെ പ്രധാന സംഗ്രഹം");
    expect(mlSummary.takeaway).toContain("പ്രധാന പാഠം");
  });

  it("generates beginner-friendly explanations in English and Malayalam", () => {
    const enExpl = generateSimpleExplanation(SAMPLE_TEXT, "en");
    expect(enExpl.headline).toContain("Simple Explanation");
    expect(enExpl.realWorldAnalogy).toContain("Analogy:");

    const mlExpl = generateSimpleExplanation(SAMPLE_TEXT, "ml");
    expect(mlExpl.headline).toContain("ലളിതമായ വിശദീകരണം");
    expect(mlExpl.realWorldAnalogy).toContain("ഉദാഹരണം");
  });

  it("extracts concept flashcards with difficulty ratings", () => {
    const cards = generateFlashcards(SAMPLE_TEXT, "en");
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards[0]!.question).toContain("What is");
    expect(cards[0]!.difficulty).toBeDefined();

    const mlCards = generateFlashcards(SAMPLE_TEXT, "ml");
    expect(mlCards[0]!.question).toContain("എന്താണ്");
  });

  it("generates quiz questions with 4 options and explanations", () => {
    const quiz = generateQuiz(SAMPLE_TEXT, "en");
    expect(quiz.length).toBeGreaterThanOrEqual(1);
    expect(quiz[0]!.options.length).toBe(4);
    expect(quiz[0]!.explanation).toBeDefined();
    expect(quiz[0]!.correctIndex).toBeGreaterThanOrEqual(0);
    expect(quiz[0]!.correctIndex).toBeLessThan(4);
  });

  it("generates revision notes and exam checklists", () => {
    const notes = generateRevisionNotes(SAMPLE_TEXT, "en");
    expect(notes.sections.length).toBeGreaterThan(0);
    expect(notes.examChecklist.length).toBeGreaterThan(0);

    const mlNotes = generateRevisionNotes(SAMPLE_TEXT, "ml");
    expect(mlNotes.title).toContain("പുനരവലോകന കുറിപ്പുകൾ");
  });

  it("extracts key domain concepts", () => {
    const concepts = generateKeyConcepts(SAMPLE_TEXT, "en");
    expect(concepts.length).toBeGreaterThan(0);
    expect(
      concepts.some(
        (c) =>
          c.term.toLowerCase().includes("photosynthesis") || c.term.toLowerCase().includes("atp"),
      ),
    ).toBe(true);
  });

  it("generates practice recall questions", () => {
    const qs = generatePracticeQuestions(SAMPLE_TEXT, "en");
    expect(qs.length).toBeGreaterThan(0);
    expect(qs[0]!.sampleAnswer).toBeDefined();
    expect(qs[0]!.hint).toBeDefined();
  });

  it("generates a multi-day study schedule", () => {
    const plan = generateStudyPlan(SAMPLE_TEXT, "en");
    expect(plan.durationDays).toBe(3);
    expect(plan.schedule.length).toBe(3);
    expect(plan.schedule[0]!.tasks.length).toBeGreaterThan(0);
  });

  it("builds a complete learning kit seamlessly", () => {
    const kit = generateLearningKit("test-mat", SAMPLE_TEXT, "en");
    expect(kit.materialId).toBe("test-mat");
    expect(kit.summary).toBeDefined();
    expect(kit.flashcards?.length).toBeGreaterThan(0);
    expect(kit.quiz?.length).toBeGreaterThan(0);
  });
});
