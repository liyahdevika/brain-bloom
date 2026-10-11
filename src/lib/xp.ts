export type Goal = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt?: string | undefined;
};
export type Session = {
  id: string;
  minutes: number;
  date: string;
  distractions?: string;
  focusRating?: number;
};
export type Reflection = {
  id: string;
  date: string;
  topic: string;
  learned: string;
  explain: string;
  selfScore?: number | undefined;
  aiScore?: number | undefined;
  aiLabel?: string | undefined;
  strengths?: string[] | undefined;
  gaps?: string[] | undefined;
  followup?: string | undefined;
};

export const XP_PER_GOAL = 20;
export const XP_PER_REFLECTION = 15;
export const MIN_REFLECTION_WORDS = 20;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** A reflection counts as genuine when both answers together reach the word minimum. */
export function isGenuineReflection(r: Pick<Reflection, "learned" | "explain">) {
  return (
    words(r.learned) >= 5 &&
    words(r.explain) >= 5 &&
    words(r.learned) + words(r.explain) >= MIN_REFLECTION_WORDS
  );
}

/** XP comes only from completed goals and genuine reflections — never from timer minutes. */
export function computeXp(goals: Goal[], reflections: Reflection[]) {
  return (
    goals.filter((g) => g.done).length * XP_PER_GOAL +
    reflections.filter(isGenuineReflection).length * XP_PER_REFLECTION
  );
}

export const dayKey = (iso: string) => iso.slice(0, 10);

export function computeStreak(dates: string[], today = new Date()) {
  const set = new Set(dates.map(dayKey));
  let streak = 0;
  const d = new Date(today);
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export const levelFor = (xp: number) => Math.floor(xp / 100) + 1;
