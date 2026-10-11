import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Goal, Reflection, Session } from "./xp";

// Local-only storage for now. Swap this provider for a Cloud-backed one later.
type Data = { goals: Goal[]; sessions: Session[]; reflections: Reflection[]; isSample: boolean };
const KEY = "brainbloom:v1";

function makeSample(): Data {
  const now = new Date();
  const ago = (d: number, h = 10) => {
    const x = new Date(now);
    x.setDate(x.getDate() - d);
    x.setHours(h, 0, 0, 0);
    return x.toISOString();
  };
  return {
    isSample: true,
    goals: [
      {
        id: "g1",
        title: "Finish biology chapter 4 notes",
        done: true,
        createdAt: ago(3),
        completedAt: ago(2),
      },
      {
        id: "g2",
        title: "Solve 10 algebra problems",
        done: true,
        createdAt: ago(2),
        completedAt: ago(1),
      },
      { id: "g3", title: "Draft history essay intro", done: false, createdAt: ago(1) },
      { id: "g4", title: "Review French vocabulary", done: false, createdAt: ago(0) },
    ],
    sessions: [
      { id: "s1", minutes: 25, date: ago(5), focusRating: 4 },
      {
        id: "s2",
        minutes: 45,
        date: ago(3),
        focusRating: 3,
        distractions: "Checked messages once",
      },
      { id: "s3", minutes: 25, date: ago(2), focusRating: 5 },
      { id: "s4", minutes: 45, date: ago(1), focusRating: 4 },
      { id: "s5", minutes: 25, date: ago(0, 9), focusRating: 4 },
    ],
    reflections: [
      {
        id: "r1",
        date: ago(2),
        topic: "Photosynthesis",
        learned:
          "Plants turn light energy into chemical energy, storing it as glucose inside the chloroplasts of their leaves.",
        explain:
          "Light hits chlorophyll, water splits, oxygen is released, and carbon dioxide is fixed into sugar during the Calvin cycle.",
        selfScore: 4,
        aiScore: 4,
        aiLabel: "Solid",
        strengths: [
          "Accurately links light absorption to glucose chemical storage",
          "Correctly identifies splitting of water and Calvin cycle carbon fixation",
        ],
        gaps: ["Could mention ATP/NADPH energy carriers in the light stage"],
        followup: "Where inside the chloroplast does the Calvin cycle take place?",
      },
      {
        id: "r2",
        date: ago(1),
        topic: "Quadratic equations",
        learned:
          "The quadratic formula works for any quadratic, and the discriminant tells me how many real roots exist.",
        explain:
          "If b squared minus four a c is negative there are no real roots; zero gives one root; positive gives two.",
        selfScore: 3,
        aiScore: 3,
        aiLabel: "Getting there",
        strengths: ["Clear understanding of discriminant signs predicting root count"],
        gaps: ["Formula itself was omitted from the explanation"],
        followup: "What does discriminant = 0 look like when graphing the parabola?",
      },
    ],
  };
}

type Ctx = Data & {
  addGoal: (title: string) => void;
  toggleGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  addSession: (s: Omit<Session, "id" | "date">) => string;
  updateSession: (id: string, patch: Partial<Session>) => void;
  addReflection: (r: Omit<Reflection, "id" | "date">) => void;
  startFresh: () => void;
  loadSample: () => void;
};

const StoreCtx = createContext<Ctx | null>(null);
const uid = () => Math.random().toString(36).slice(2, 10);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(() => makeSample());
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

  // Any real action converts sample mode into the user's own data.
  const mut = (fn: (d: Data) => Data) =>
    setData((d) =>
      fn(d.isSample ? { goals: [], sessions: [], reflections: [], isSample: false } : d),
    );

  const value = useMemo<Ctx>(
    () => ({
      ...data,
      addGoal: (title) =>
        mut((d) => ({
          ...d,
          goals: [
            { id: uid(), title, done: false, createdAt: new Date().toISOString() },
            ...d.goals,
          ],
        })),
      toggleGoal: (id) =>
        setData((d) => ({
          ...d,
          goals: d.goals.map((g) =>
            g.id === id
              ? { ...g, done: !g.done, completedAt: !g.done ? new Date().toISOString() : undefined }
              : g,
          ),
        })),
      removeGoal: (id) => setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })),
      addSession: (s) => {
        const id = uid();
        mut((d) => ({
          ...d,
          sessions: [...d.sessions, { ...s, id, date: new Date().toISOString() }],
        }));
        return id;
      },
      updateSession: (id, patch) =>
        setData((d) => ({
          ...d,
          sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      addReflection: (r) =>
        mut((d) => ({
          ...d,
          reflections: [{ ...r, id: uid(), date: new Date().toISOString() }, ...d.reflections],
        })),
      startFresh: () => setData({ goals: [], sessions: [], reflections: [], isSample: false }),
      loadSample: () => setData(makeSample()),
    }),
    [data],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
