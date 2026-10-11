import { describe, it, expect } from "vitest";
import { computeXp, isGenuineReflection, computeStreak } from "@/lib/xp";

const long =
  "I learned that photosynthesis converts light energy into chemical energy stored as glucose";
const long2 =
  "Plants use chlorophyll to capture sunlight and make sugar from water and carbon dioxide";

describe("xp rules", () => {
  it("completed goal gives 20 XP, pending gives 0", () => {
    const goals = [
      { id: "1", title: "a", done: true, createdAt: "" },
      { id: "2", title: "b", done: false, createdAt: "" },
    ];
    expect(computeXp(goals, [])).toBe(20);
  });
  it("genuine reflection gives 15 XP, a short one gives 0", () => {
    const good = { id: "r", date: "", topic: "", learned: long, explain: long2, selfScore: 3 };
    const bad = { ...good, learned: "stuff", explain: "ok" };
    expect(isGenuineReflection(bad)).toBe(false);
    expect(computeXp([], [good, bad])).toBe(15);
  });
  it("streak counts consecutive days", () => {
    expect(
      computeStreak(["2026-10-10", "2026-10-09", "2026-10-07"], new Date("2026-10-10T12:00:00Z")),
    ).toBe(2);
  });
});
