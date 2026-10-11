import { describe, it, expect } from "vitest";
import {
  evaluateExplanationHeuristic,
  safeParseThinkBackJson,
  evaluateThinkBackSubmission,
  buildThinkBackPrompt,
} from "@/lib/ai/thinkback-evaluator";

describe("ThinkBack AI Pedagogical Evaluation", () => {
  const WEAK_SUBMISSION = {
    topic: "Cell Division",
    learned: "it was about cells and stuff.",
    explain: "they do things like divide i think. not sure about the rest or whatever.",
  };

  const AVERAGE_SUBMISSION = {
    topic: "Photosynthesis",
    learned: "Plants create food using sunlight, water, and carbon dioxide.",
    explain:
      "Photosynthesis is the process where plants make food using sunlight. Water and carbon dioxide are needed, and oxygen is released as a byproduct for humans to breathe.",
  };

  const STRONG_SUBMISSION = {
    topic: "Photosynthesis",
    learned:
      "Light reactions and Calvin cycle convert photon energy into chemical glucose bonds inside chloroplasts.",
    explain:
      "Photosynthesis occurs within plant chloroplasts and consists of two main stages: the light-dependent reactions and the Calvin cycle. In the light reactions, chlorophyll absorbs photon energy to split water into protons, electrons, and oxygen gas, generating ATP and NADPH. These energy carriers then drive the light-independent Calvin cycle in the stroma to fix carbon dioxide into glucose for cellular storage.",
  };

  it("evaluates a WEAK answer with low score (1-2) and identifies vagueness gaps", () => {
    const result = evaluateExplanationHeuristic(
      WEAK_SUBMISSION.topic,
      WEAK_SUBMISSION.learned,
      WEAK_SUBMISSION.explain,
    );

    expect(result.score).toBeLessThanOrEqual(2);
    expect(["Lost", "Shaky"]).toContain(result.label);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps.some((g) => g.toLowerCase().includes("vague"))).toBe(true);
    expect(result.followup).toContain("Cell Division");
  });

  it("evaluates an AVERAGE answer with moderate score (3) and identifies missing intermediate steps", () => {
    const result = evaluateExplanationHeuristic(
      AVERAGE_SUBMISSION.topic,
      AVERAGE_SUBMISSION.learned,
      AVERAGE_SUBMISSION.explain,
    );

    expect(result.score).toBe(3);
    expect(result.label).toBe("Getting there");
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.strengths.some((s) => s.toLowerCase().includes("foundational"))).toBe(true);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.followup.length).toBeGreaterThan(10);
  });

  it("evaluates a STRONG answer with high score (4-5) and recognizes causal mechanisms", () => {
    const result = evaluateExplanationHeuristic(
      STRONG_SUBMISSION.topic,
      STRONG_SUBMISSION.learned,
      STRONG_SUBMISSION.explain,
    );

    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(["Solid", "Could teach it"]).toContain(result.label);
    expect(result.strengths.length).toBeGreaterThanOrEqual(2);
    expect(
      result.strengths.some(
        (s) => s.toLowerCase().includes("causal") || s.toLowerCase().includes("terminology"),
      ),
    ).toBe(true);
    expect(result.followup).toBeDefined();
  });

  it("safely parses clean JSON output", () => {
    const rawJson = JSON.stringify({
      score: 4,
      label: "Solid",
      strengths: ["Clear terminology", "Accurate steps"],
      gaps: ["Could mention efficiency"],
      followup: "How is ATP regenerated?",
      summaryMessage: "Well done!",
    });

    const parsed = safeParseThinkBackJson(rawJson, "Biology");
    expect(parsed.score).toBe(4);
    expect(parsed.label).toBe("Solid");
    expect(parsed.strengths).toEqual(["Clear terminology", "Accurate steps"]);
    expect(parsed.followup).toBe("How is ATP regenerated?");
  });

  it("safely strips markdown code blocks and whitespace from LLM output", () => {
    const markdownWrapped = `
\`\`\`json
{
  "score": 5,
  "label": "Could teach it",
  "strengths": ["Exemplary causal reasoning"],
  "gaps": ["None identified"],
  "followup": "What happens in extreme drought?",
  "summaryMessage": "Mastery level explanation!"
}
\`\`\`
`;

    const parsed = safeParseThinkBackJson(markdownWrapped, "Biology");
    expect(parsed.score).toBe(5);
    expect(parsed.label).toBe("Could teach it");
    expect(parsed.strengths).toContain("Exemplary causal reasoning");
  });

  it("clamps out-of-bounds scores safely between 1 and 5", () => {
    const high = safeParseThinkBackJson(JSON.stringify({ score: 10 }), "Test");
    expect(high.score).toBe(5);

    const low = safeParseThinkBackJson(JSON.stringify({ score: -5 }), "Test");
    expect(low.score).toBe(1);
  });

  it("falls back to heuristic evaluation when JSON is completely invalid", () => {
    const garbageText = "Not a json response at all, but some random text.";
    const fallback = safeParseThinkBackJson(
      garbageText,
      AVERAGE_SUBMISSION.topic,
      AVERAGE_SUBMISSION.learned,
      AVERAGE_SUBMISSION.explain,
    );

    expect(fallback.score).toBeGreaterThanOrEqual(1);
    expect(fallback.score).toBeLessThanOrEqual(5);
    expect(fallback.strengths.length).toBeGreaterThan(0);
    expect(fallback.gaps.length).toBeGreaterThan(0);
  });

  it("builds a prompt containing student topic, learned, and explanation text", () => {
    const prompt = buildThinkBackPrompt("Recursion", "Base cases", "Function calls itself");
    expect(prompt).toContain("Recursion");
    expect(prompt).toContain("Base cases");
    expect(prompt).toContain("Function calls itself");
    expect(prompt).toContain("Evaluation Rubric");
  });

  it("executes the server evaluation handler and returns a structured response", async () => {
    const res = await evaluateThinkBackSubmission(STRONG_SUBMISSION);
    expect(res.success).toBe(true);
    expect(res.evaluation).toBeDefined();
    expect(res.evaluation!.score).toBeGreaterThanOrEqual(1);
    expect(res.evaluation!.score).toBeLessThanOrEqual(5);
    expect(res.evaluation!.strengths.length).toBeGreaterThan(0);
    expect(res.evaluation!.gaps.length).toBeGreaterThan(0);
    expect(res.evaluation!.followup).toBeDefined();
  });
});
