import type { SupportedLanguage } from "../extractors/types";

export type ExplanationLevel = "beginner" | "intermediate" | "advanced";
export type AnswerStyle = "hints_first" | "step_by_step" | "quick";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  sourceContext?: {
    materialId?: string | undefined;
    materialTitle?: string | undefined;
    slideNumber?: number | undefined;
    pageNumber?: number | undefined;
    isDocumentGrounded: boolean;
  } | undefined;
  thinkFirstPrompt?: string | undefined;
  isError?: boolean | undefined;
};

export type BloomBuddyPreferences = {
  language: SupportedLanguage;
  explanationLevel: ExplanationLevel;
  answerStyle: AnswerStyle;
  thinkFirstMode: boolean;
  activeMaterialId?: string | null | undefined;
};

export type AiServerRequest = {
  messages: Array<{ role: ChatRole; content: string }>;
  preferences: BloomBuddyPreferences;
  documentContext?: {
    materialTitle: string;
    materialType: string;
    extractedText: string;
    slideCount?: number | undefined;
    pageCount?: number | undefined;
  } | null | undefined;
  studentAttempt?: string | undefined;
};

export type AiServerResponse = {
  success: boolean;
  reply?: string | undefined;
  sourceCitations?: Array<{ label: string; textSnippet?: string | undefined }> | undefined;
  configured: boolean;
  provider?: ("gemini" | "ollama" | "lmstudio" | "none") | undefined;
  errorMessage?: string | undefined;
  setupInstructions?: string | undefined;
};

export type ThinkBackEvaluation = {
  score: number; // 1 to 5
  label: string; // "Lost" | "Shaky" | "Getting there" | "Solid" | "Could teach it"
  strengths: string[];
  gaps: string[];
  followup: string;
  summaryMessage?: string | undefined;
};

export type ThinkBackEvaluationRequest = {
  topic: string;
  learned: string;
  explain: string;
};

export type ThinkBackServerResponse = {
  success: boolean;
  evaluation?: ThinkBackEvaluation | undefined;
  provider?: ("gemini" | "ollama" | "lmstudio" | "heuristic") | undefined;
  errorMessage?: string | undefined;
};
