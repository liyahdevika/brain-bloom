import { createServerFn } from "@tanstack/react-start";
import type {
  AiServerRequest,
  AiServerResponse,
  ThinkBackEvaluationRequest,
  ThinkBackServerResponse,
} from "./types";
import { buildSystemPrompt } from "./prompts";
import { evaluateThinkBackSubmission } from "./thinkback-evaluator";

/**
 * Server-Side AI handler for BloomBuddy.
 * Executes strictly on the server runtime — API keys are NEVER sent to or visible in client browser code.
 */
export async function handleBloomBuddyRequest(data: AiServerRequest): Promise<AiServerResponse> {
  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
  const ollamaHost = process.env["OLLAMA_HOST"]?.trim() || "http://127.0.0.1:11434";
  const lmStudioHost = process.env["LM_STUDIO_HOST"]?.trim() || "http://127.0.0.1:1234";

  const systemPrompt = buildSystemPrompt(data);
  const lastUserMessage = data.messages[data.messages.length - 1]?.content || "";

  // 1. Try Google Gemini API if configured
  if (geminiKey) {
    try {
      const result = await callGeminiApi(geminiKey, systemPrompt, data.messages);
      const citations = detectDocumentCitations(
        data.documentContext?.extractedText,
        lastUserMessage,
      );

      return {
        success: true,
        configured: true,
        provider: "gemini",
        reply: result,
        sourceCitations: citations,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("BloomBuddy Gemini error:", msg);
      return {
        success: false,
        configured: true,
        provider: "gemini",
        errorMessage: msg.includes("429")
          ? "Gemini rate limit reached. Please wait a moment before asking again."
          : msg.includes("403") || msg.includes("API key not valid")
            ? "Invalid GEMINI_API_KEY. Please verify your key at https://aistudio.google.com/app/apikey"
            : `AI service error: ${msg}`,
      };
    }
  }

  // 2. Try Local Ollama if available
  try {
    const ollamaRes = await fetch(`${ollamaHost}/api/tags`, {
      signal: AbortSignal.timeout(1200),
    }).catch(() => null);

    if (ollamaRes && ollamaRes.ok) {
      const reply = await callOllamaApi(ollamaHost, systemPrompt, data.messages);
      const citations = detectDocumentCitations(
        data.documentContext?.extractedText,
        lastUserMessage,
      );

      return {
        success: true,
        configured: true,
        provider: "ollama",
        reply,
        sourceCitations: citations,
      };
    }
  } catch {
    // Ollama not running
  }

  // 3. Try Local LM Studio if available
  try {
    const lmRes = await fetch(`${lmStudioHost}/v1/models`, {
      signal: AbortSignal.timeout(1200),
    }).catch(() => null);

    if (lmRes && lmRes.ok) {
      const reply = await callLmStudioApi(lmStudioHost, systemPrompt, data.messages);
      const citations = detectDocumentCitations(
        data.documentContext?.extractedText,
        lastUserMessage,
      );

      return {
        success: true,
        configured: true,
        provider: "lmstudio",
        reply,
        sourceCitations: citations,
      };
    }
  } catch {
    // LM Studio not running
  }

  // 4. Honest Unconfigured State: Do NOT simulate or fake AI
  return {
    success: false,
    configured: false,
    provider: "none",
    setupInstructions:
      "No live AI provider configured. Add GEMINI_API_KEY=your_key in .env (get a free key at https://aistudio.google.com/app/apikey) or start Ollama/LM Studio locally.",
    reply:
      data.preferences.language === "ml"
        ? "BloomBuddy AI തയ്യാറാണ്, എന്നാൽ സെർവറിൽ AI കീ നൽകിയിട്ടില്ല. ലൈവ് AI ഉത്തരങ്ങൾ ലഭിക്കുന്നതിന് .env ഫയലിൽ GEMINI_API_KEY ചേർക്കുക."
        : "BloomBuddy AI is ready, but no live AI model is configured on the server yet. To enable live answers, add GEMINI_API_KEY to your .env file or run Ollama/LM Studio locally.",
  };
}

/**
 * Server-Side AI handler for BloomBuddy.
 * Executes strictly on the server runtime — API keys are NEVER sent to or visible in client browser code.
 */
export const askBloomBuddy = createServerFn({ method: "POST" })
  .validator((d: AiServerRequest) => d)
  .handler(async ({ data }): Promise<AiServerResponse> => handleBloomBuddyRequest(data));

/**
 * Server-Side AI handler for ThinkBack unassisted explanation evaluation.
 * Executes strictly on the server runtime — uses env-variable API key with safe parsing.
 */
export const evaluateThinkBack = createServerFn({ method: "POST" })
  .validator((d: ThinkBackEvaluationRequest) => d)
  .handler(async ({ data }): Promise<ThinkBackServerResponse> => evaluateThinkBackSubmission(data));

/**
 * Google Gemini REST API Client
 */
async function callGeminiApi(
  apiKey: string,
  systemInstruction: string,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Build Gemini multi-turn format
  const contents = [
    {
      role: "user",
      parts: [{ text: systemInstruction }],
    },
    {
      role: "model",
      parts: [
        {
          text: "Understood. I am BloomBuddy, your supportive AI study companion. I will follow your guidance on language, explanation level, and document context.",
        },
      ],
    },
    ...messages.slice(-8).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
      },
    }),
    signal: AbortSignal.timeout(18000),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini API returned status ${res.status}: ${errorBody}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No text candidate returned by Gemini model.");
  }

  return text.trim();
}

/**
 * Local Ollama Client
 */
async function callOllamaApi(
  host: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env["OLLAMA_MODEL"] || "llama3",
      stream: false,
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-8)],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Ollama returned status ${res.status}`);
  const json = await res.json();
  return json.message?.content || "";
}

/**
 * Local LM Studio Client
 */
async function callLmStudioApi(
  host: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const res = await fetch(`${host}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-8)],
      temperature: 0.7,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`LM Studio returned status ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

/**
 * Helper to match query keywords with slide numbers or page markers in extracted text
 */
function detectDocumentCitations(
  extractedText: string | undefined,
  query: string,
): Array<{ label: string; textSnippet?: string }> {
  if (!extractedText || !query) return [];

  const citations: Array<{ label: string; textSnippet?: string }> = [];
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  // Check PPTX slide patterns: "### Slide 2: Title"
  const slideRegex = /### Slide (\d+):[^\n]*\n([\s\S]*?)(?=(?:### Slide \d+:|$))/g;
  let match: RegExpExecArray | null;

  while ((match = slideRegex.exec(extractedText)) !== null) {
    const slideNum = match[1];
    const slideContent = match[2];
    if (slideNum && slideContent) {
      const lower = slideContent.toLowerCase();
      const matchesWord = queryWords.some((w) => lower.includes(w));
      if (matchesWord && citations.length < 3) {
        citations.push({
          label: `Slide ${slideNum}`,
          textSnippet: slideContent.trim().slice(0, 120),
        });
      }
    }
  }

  return citations;
}
