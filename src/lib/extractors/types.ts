export type MaterialType = "pdf" | "ppt" | "image" | "camera" | "youtube" | "text";

export type ProcessingStatus = "idle" | "uploading" | "processing" | "ready" | "error";

export type SlideData = {
  slideNumber: number;
  title?: string | undefined;
  text: string;
};

export type MaterialMetadata = {
  pageCount?: number | undefined;
  slideCount?: number | undefined;
  slides?: SlideData[] | undefined;
  videoId?: string | undefined;
  authorName?: string | undefined;
  duration?: string | undefined;
  wordCount?: number | undefined;
  detectedLanguage?: string | undefined;
  hasTranscript?: boolean | undefined;
};

export type ImportedMaterial = {
  id: string;
  title: string;
  type: MaterialType;
  sizeBytes: number;
  status: ProcessingStatus;
  progress: number; // 0 - 100
  previewUrl?: string | undefined; // Image blob, thumbnail or icon
  extractedText: string;
  originalText?: string | undefined; // Kept to allow "reset to original"
  metadata?: MaterialMetadata | undefined;
  errorMessage?: string | undefined;
  createdAt: string;
  updatedAt: string;
};

export type SupportedLanguage = "en" | "ml";

export type LanguageOption = {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
};

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
];

export type StudySummary = {
  overview: string;
  keyPoints: string[];
  takeaway: string;
};

export type SimpleExplanation = {
  headline: string;
  simpleBreakdown: string[];
  realWorldAnalogy: string;
  keyRule: string;
};

export type GeneratedFlashcard = {
  id: string;
  question: string;
  answer: string;
  concept: string;
  difficulty?: "easy" | "medium" | "hard" | undefined;
};

export type GeneratedQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type RevisionNotes = {
  title: string;
  sections: { heading: string; bullets: string[] }[];
  formulasOrRules: string[];
  examChecklist: string[];
};

export type KeyConcept = {
  term: string;
  definition: string;
  importance: "high" | "medium";
};

export type PracticeQuestion = {
  id: string;
  type: "short" | "concept" | "application";
  question: string;
  sampleAnswer: string;
  hint: string;
};

export type StudyPlanDay = {
  day: number;
  title: string;
  focus: string;
  tasks: string[];
  estimatedMinutes: number;
};

export type StudyPlan = {
  durationDays: number;
  schedule: StudyPlanDay[];
  advice: string;
};

export type GeneratedLearningKit = {
  materialId: string;
  language: SupportedLanguage;
  summary?: StudySummary | undefined;
  simpleExplanation?: SimpleExplanation | undefined;
  flashcards?: GeneratedFlashcard[] | undefined;
  quiz?: GeneratedQuizQuestion[] | undefined;
  revisionNotes?: RevisionNotes | undefined;
  concepts?: KeyConcept[] | undefined;
  practiceQuestions?: PracticeQuestion[] | undefined;
  studyPlan?: StudyPlan | undefined;
  generatedAt: string;
};
