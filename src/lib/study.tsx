import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Local-only study library (this browser). Swap for a Cloud-backed provider later.
export type Difficulty = "easy" | "medium" | "hard";
export type Subject = { id: string; name: string; demo?: boolean };
export type Topic = { id: string; subjectId: string; name: string; notes: string; demo?: boolean };
export type Card = { id: string; deckId: string; q: string; a: string; difficulty?: Difficulty };
export type Deck = { id: string; subjectId?: string; name: string; demo?: boolean };
export type QuizQ = { q: string; options: string[]; correct: number; explanation: string };
export type Quiz = {
  id: string;
  subjectId?: string;
  title: string;
  questions: QuizQ[];
  source: "demo" | "manual" | "ai";
};
export type Attempt = { id: string; quizId: string; score: number; total: number; date: string };

type Data = {
  subjects: Subject[];
  topics: Topic[];
  decks: Deck[];
  cards: Card[];
  quizzes: Quiz[];
  attempts: Attempt[];
};
const KEY = "brainbloom:study:v1";
const uid = () => Math.random().toString(36).slice(2, 10);

function demo(): Data {
  return {
    subjects: [
      { id: "bio", name: "Biology", demo: true },
      { id: "math", name: "Maths", demo: true },
    ],
    topics: [
      {
        id: "t1",
        subjectId: "bio",
        name: "Photosynthesis",
        notes:
          "Light reactions in thylakoids, Calvin cycle in stroma. Produces glucose and oxygen.",
        demo: true,
      },
      {
        id: "t2",
        subjectId: "math",
        name: "Quadratics",
        notes: "ax² + bx + c = 0. Discriminant b² − 4ac decides number of real roots.",
        demo: true,
      },
    ],
    decks: [{ id: "d1", subjectId: "bio", name: "Cell biology basics", demo: true }],
    cards: [
      {
        id: "c1",
        deckId: "d1",
        q: "Where does photosynthesis happen?",
        a: "In the chloroplasts of plant cells.",
      },
      {
        id: "c2",
        deckId: "d1",
        q: "What does the mitochondria do?",
        a: "Releases energy from glucose through cellular respiration.",
      },
      {
        id: "c3",
        deckId: "d1",
        q: "What is osmosis?",
        a: "Movement of water across a partially permeable membrane from dilute to concentrated solution.",
      },
    ],
    quizzes: [
      {
        id: "q1",
        subjectId: "bio",
        title: "Photosynthesis basics",
        source: "demo",
        questions: [
          {
            q: "Which gas do plants absorb for photosynthesis?",
            options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
            correct: 1,
            explanation: "Plants take in CO₂ and fix it into glucose during the Calvin cycle.",
          },
          {
            q: "Which pigment captures light?",
            options: ["Haemoglobin", "Melanin", "Chlorophyll", "Keratin"],
            correct: 2,
            explanation:
              "Chlorophyll in the thylakoid membranes absorbs mainly red and blue light.",
          },
          {
            q: "What is a product of photosynthesis?",
            options: ["Glucose", "Protein", "Starch only", "Carbon dioxide"],
            correct: 0,
            explanation:
              "Glucose and oxygen are the products; glucose may later be stored as starch.",
          },
        ],
      },
    ],
    attempts: [],
  };
}

type Ctx = Data & {
  addSubject: (name: string) => void;
  removeSubject: (id: string) => void;
  addTopic: (subjectId: string, name: string, notes: string) => void;
  updateTopic: (id: string, notes: string) => void;
  removeTopic: (id: string) => void;
  addDeck: (name: string, subjectId?: string) => string;
  removeDeck: (id: string) => void;
  addCard: (deckId: string, q: string, a: string) => void;
  removeCard: (id: string) => void;
  rateCard: (id: string, d: Difficulty) => void;
  addQuiz: (quiz: Omit<Quiz, "id">) => void;
  removeQuiz: (id: string) => void;
  addAttempt: (quizId: string, score: number, total: number) => void;
};

const StudyCtx = createContext<Ctx | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(() => demo());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      // ignore corrupted storage
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(data));
  }, [data, loaded]);

  const value = useMemo<Ctx>(() => {
    const up = (fn: (d: Data) => Data) => setData(fn);
    return {
      ...data,
      addSubject: (name) => up((d) => ({ ...d, subjects: [...d.subjects, { id: uid(), name }] })),
      removeSubject: (id) =>
        up((d) => ({
          ...d,
          subjects: d.subjects.filter((s) => s.id !== id),
          topics: d.topics.filter((t) => t.subjectId !== id),
        })),
      addTopic: (subjectId, name, notes) =>
        up((d) => ({ ...d, topics: [...d.topics, { id: uid(), subjectId, name, notes }] })),
      updateTopic: (id, notes) =>
        up((d) => ({ ...d, topics: d.topics.map((t) => (t.id === id ? { ...t, notes } : t)) })),
      removeTopic: (id) => up((d) => ({ ...d, topics: d.topics.filter((t) => t.id !== id) })),
      addDeck: (name, subjectId) => {
        const id = uid();
        up((d) => ({
          ...d,
          decks: [...d.decks, subjectId ? { id, name, subjectId } : { id, name }],
        }));
        return id;
      },
      removeDeck: (id) =>
        up((d) => ({
          ...d,
          decks: d.decks.filter((x) => x.id !== id),
          cards: d.cards.filter((c) => c.deckId !== id),
        })),
      addCard: (deckId, q, a) =>
        up((d) => ({ ...d, cards: [...d.cards, { id: uid(), deckId, q, a }] })),
      removeCard: (id) => up((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) })),
      rateCard: (id, difficulty) =>
        up((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, difficulty } : c)) })),
      addQuiz: (quiz) => up((d) => ({ ...d, quizzes: [...d.quizzes, { ...quiz, id: uid() }] })),
      removeQuiz: (id) => up((d) => ({ ...d, quizzes: d.quizzes.filter((q) => q.id !== id) })),
      addAttempt: (quizId, score, total) =>
        up((d) => ({
          ...d,
          attempts: [
            ...d.attempts,
            { id: uid(), quizId, score, total, date: new Date().toISOString() },
          ],
        })),
    };
  }, [data]);

  return <StudyCtx.Provider value={value}>{children}</StudyCtx.Provider>;
}

export function useStudy() {
  const c = useContext(StudyCtx);
  if (!c) throw new Error("useStudy outside provider");
  return c;
}

/** Cards due for review: hard first, then unrated/medium. Easy cards are skipped. */
export function reviewQueue(cards: Card[], hardOnly = false) {
  const rank = { hard: 0, undefined: 1, medium: 2, easy: 3 } as const;
  const list = hardOnly
    ? cards.filter((c) => c.difficulty === "hard")
    : cards.filter((c) => c.difficulty !== "easy");
  return [...list].sort(
    (a, b) =>
      rank[String(a.difficulty) as keyof typeof rank] -
      rank[String(b.difficulty) as keyof typeof rank],
  );
}

export const scoreQuiz = (qs: QuizQ[], answers: (number | null)[]) =>
  qs.reduce((n, q, i) => n + (answers[i] === q.correct ? 1 : 0), 0);
