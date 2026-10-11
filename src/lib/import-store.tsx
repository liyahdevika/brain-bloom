import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  GeneratedFlashcard,
  GeneratedLearningKit,
  GeneratedQuizQuestion,
  ImportedMaterial,
} from "./extractors/types";
import type { useStudy } from "./study";

type ImportData = {
  materials: ImportedMaterial[];
  learningKits: Record<string, GeneratedLearningKit>;
};

const STORAGE_KEY = "brainbloom:imports:v1";

function sampleImports(): ImportData {
  const now = new Date().toISOString();
  const sampleMaterial: ImportedMaterial = {
    id: "sample-bio-1",
    title: "Cellular Respiration & Photosynthesis",
    type: "text",
    sizeBytes: 840,
    status: "ready",
    progress: 100,
    extractedText: `Photosynthesis is the biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy stored in glucose.

Key Stages:
1. Light Reactions: Occur in the thylakoid membranes of chloroplasts. Chlorophyll absorbs sunlight, water molecules are split (photolysis), releasing oxygen as a byproduct, and generating ATP and NADPH.
2. Calvin Cycle (Light-Independent Reactions): Occurs in the stroma of chloroplasts. Carbon dioxide is fixed into carbohydrates using ATP and NADPH.

Mitochondria: Often referred to as the powerhouse of the cell, mitochondria generate cellular energy through aerobic cellular respiration.

ATP (Adenosine Triphosphate): The universal energy currency of cells, transferring energy to drive cellular processes.`,
    originalText: `Photosynthesis is the biological process used by plants...`,
    metadata: {
      wordCount: 112,
    },
    createdAt: now,
    updatedAt: now,
  };

  return {
    materials: [sampleMaterial],
    learningKits: {},
  };
}

type ImportCtx = {
  materials: ImportedMaterial[];
  learningKits: Record<string, GeneratedLearningKit>;
  addMaterial: (material: ImportedMaterial) => void;
  updateMaterial: (id: string, patch: Partial<ImportedMaterial>) => void;
  removeMaterial: (id: string) => void;
  saveLearningKit: (materialId: string, kit: GeneratedLearningKit) => void;
  exportToFlashcards: (
    deckName: string,
    cards: GeneratedFlashcard[],
    study: ReturnType<typeof useStudy>,
  ) => string;
  exportToQuizzes: (
    quizTitle: string,
    questions: GeneratedQuizQuestion[],
    study: ReturnType<typeof useStudy>,
  ) => void;
  clearAll: () => void;
};

const ImportContext = createContext<ImportCtx | null>(null);

export function ImportProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ImportData>(() => sampleImports());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.materials)) {
          setData(parsed);
        }
      }
    } catch {
      // Keep initial
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Handle quota if large previews stored
      }
    }
  }, [data, loaded]);

  const value = useMemo<ImportCtx>(
    () => ({
      materials: data.materials,
      learningKits: data.learningKits,
      addMaterial: (material) =>
        setData((d) => ({
          ...d,
          materials: [material, ...d.materials.filter((m) => m.id !== material.id)],
        })),
      updateMaterial: (id, patch) =>
        setData((d) => ({
          ...d,
          materials: d.materials.map((m) =>
            m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m,
          ),
        })),
      removeMaterial: (id) =>
        setData((d) => {
          const kits = { ...d.learningKits };
          delete kits[id];
          return {
            ...d,
            materials: d.materials.filter((m) => m.id !== id),
            learningKits: kits,
          };
        }),
      saveLearningKit: (materialId, kit) =>
        setData((d) => ({
          ...d,
          learningKits: {
            ...d.learningKits,
            [materialId]: kit,
          },
        })),
      exportToFlashcards: (deckName, cards, study) => {
        const deckId = study.addDeck(deckName);
        for (const card of cards) {
          study.addCard(deckId, card.question, card.answer);
        }
        return deckId;
      },
      exportToQuizzes: (quizTitle, questions, study) => {
        study.addQuiz({
          title: quizTitle,
          source: "ai",
          questions: questions.map((q) => ({
            q: q.question,
            options: q.options,
            correct: q.correctIndex,
            explanation: q.explanation,
          })),
        });
      },
      clearAll: () => setData({ materials: [], learningKits: {} }),
    }),
    [data],
  );

  return <ImportContext.Provider value={value}>{children}</ImportContext.Provider>;
}

export function useImport() {
  const ctx = useContext(ImportContext);
  if (!ctx) {
    throw new Error("useImport must be used within an ImportProvider");
  }
  return ctx;
}
