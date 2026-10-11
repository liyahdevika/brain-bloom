import { describe, it, expect } from "vitest";
import { reviewQueue, scoreQuiz } from "@/lib/study";

const c = (id: string, difficulty?: "easy" | "medium" | "hard") => ({
  id,
  deckId: "d",
  q: "",
  a: "",
  ...(difficulty ? { difficulty } : {}),
});

describe("flashcard review", () => {
  it("skips easy cards and puts hard cards first", () => {
    expect(
      reviewQueue([c("e", "easy"), c("m", "medium"), c("h", "hard"), c("n")]).map((x) => x.id),
    ).toEqual(["h", "n", "m"]);
  });
  it("hard-only review returns only hard cards", () => {
    expect(reviewQueue([c("m", "medium"), c("h", "hard")], true).map((x) => x.id)).toEqual(["h"]);
  });
});

describe("quiz score", () => {
  it("counts correct answers", () => {
    const qs = [
      { q: "", options: [], correct: 1, explanation: "" },
      { q: "", options: [], correct: 0, explanation: "" },
    ];
    expect(scoreQuiz(qs, [1, 2])).toBe(1);
  });
});
