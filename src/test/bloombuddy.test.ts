import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { handleBloomBuddyRequest } from "@/lib/ai/server";
import type { AiServerRequest } from "@/lib/ai/types";

describe("BloomBuddy AI Prompts Builder", () => {
  it("builds friendly beginner-level English prompt with hints-first style", () => {
    const req: AiServerRequest = {
      messages: [{ role: "user", content: "How do binary search trees work?" }],
      preferences: {
        language: "en",
        explanationLevel: "beginner",
        answerStyle: "hints_first",
        thinkFirstMode: false,
      },
    };

    const prompt = buildSystemPrompt(req);
    expect(prompt).toContain("BloomBuddy");
    expect(prompt).toContain("Target Audience: Beginner");
    expect(prompt).toContain("Answer Style: HINTS FIRST");
    expect(prompt).toContain("Language: Respond in clear, encouraging English");
  });

  it("builds Malayalam language prompt with intermediate level and step-by-step style", () => {
    const req: AiServerRequest = {
      messages: [{ role: "user", content: "എന്താണ് റികർഷൻ?" }],
      preferences: {
        language: "ml",
        explanationLevel: "intermediate",
        answerStyle: "step_by_step",
        thinkFirstMode: false,
      },
    };

    const prompt = buildSystemPrompt(req);
    expect(prompt).toContain("Malayalam (മലയാളം)");
    expect(prompt).toContain("Target Audience: Intermediate");
    expect(prompt).toContain("STEP-BY-STEP");
  });

  it("incorporates Think First student attempts constructively", () => {
    const req: AiServerRequest = {
      messages: [{ role: "user", content: "What is the time complexity of quicksort?" }],
      preferences: {
        language: "en",
        explanationLevel: "intermediate",
        answerStyle: "step_by_step",
        thinkFirstMode: true,
      },
      studentAttempt: "I think it is O(n log n) in average case and O(n^2) worst case.",
    };

    const prompt = buildSystemPrompt(req);
    expect(prompt).toContain("STUDENT'S INITIAL ATTEMPT (Think First)");
    expect(prompt).toContain("I think it is O(n log n)");
    expect(prompt).toContain("Acknowledge their thinking first!");
  });

  it("grounds answers in uploaded document text with slide and citation rules", () => {
    const req: AiServerRequest = {
      messages: [{ role: "user", content: "Where does the Calvin cycle take place?" }],
      preferences: {
        language: "en",
        explanationLevel: "beginner",
        answerStyle: "quick",
        thinkFirstMode: false,
      },
      documentContext: {
        materialTitle: "Biology Chapter 4 Presentation",
        materialType: "ppt",
        extractedText:
          "### Slide 1: Photosynthesis Intro\nLight energy converts to chemical energy.\n\n### Slide 2: Calvin Cycle\nThe Calvin cycle takes place in the stroma of chloroplasts.",
        slideCount: 2,
      },
    };

    const prompt = buildSystemPrompt(req);
    expect(prompt).toContain(
      'The student has selected an uploaded material titled "Biology Chapter 4 Presentation"',
    );
    expect(prompt).toContain("Calvin cycle takes place in the stroma");
    expect(prompt).toContain("cite the specific slide or page number");
  });
});

describe("BloomBuddy Server AI Handler", () => {
  it("honestly reports unconfigured status when no API key or local model is active", async () => {
    // In test environment, GEMINI_API_KEY is not set
    const res = await handleBloomBuddyRequest({
      messages: [{ role: "user", content: "Hello BloomBuddy!" }],
      preferences: {
        language: "en",
        explanationLevel: "beginner",
        answerStyle: "hints_first",
        thinkFirstMode: false,
      },
    });

    expect(res).toBeDefined();
    // It should not fake an AI response
    if (!res.configured) {
      expect(res.provider).toBe("none");
      expect(res.setupInstructions).toContain("GEMINI_API_KEY");
      expect(res.reply).toContain("BloomBuddy AI is ready, but no live AI model is configured");
    }
  });
});
