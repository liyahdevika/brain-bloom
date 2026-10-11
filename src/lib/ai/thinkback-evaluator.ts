import type { ThinkBackEvaluation, ThinkBackEvaluationRequest, ThinkBackServerResponse } from "./types";

export const THINKBACK_LABELS: Record<number, string> = {
  1: "Lost",
  2: "Shaky",
  3: "Getting there",
  4: "Solid",
  5: "Could teach it",
};

/**
 * Builds the system evaluation prompt for ThinkBack Tutor
 */
export function buildThinkBackPrompt(topic: string, learned: string, explain: string): string {
  const safeTopic = topic.trim() || "Course Concept";
  return `You are ThinkBack Tutor, an expert pedagogical evaluator.
A student just completed a self-study session on "${safeTopic}" and was asked to explain the concept completely from memory without notes.

Student Submission:
Topic: "${safeTopic}"
What they learned: "${learned.trim()}"
Their unassisted explanation: "${explain.trim()}"

Evaluation Rubric:
- Score 1 (Lost): Significant misconceptions, off-topic, or completely vague without substance.
- Score 2 (Shaky): Remembers a few scattered terms or phrases, but the mechanism is broken or confused.
- Score 3 (Getting there): Sound foundational idea, but omits intermediate steps, key definitions, or formulas.
- Score 4 (Solid): Accurate, clear causal explanation with proper steps and correct terminology. Minimal gaps.
- Score 5 (Could teach it): Outstanding clarity, precise technical vocabulary, step-by-step causality, and deep conceptual insight.

Requirements:
- Judge true understanding, not just fancy words.
- Provide 1 to 3 specific strengths observed in their explanation.
- Provide 1 to 3 key missing elements, gaps, or areas needing precision.
- Formulate 1 thought-provoking follow-up question to test their deeper grasp.
- Keep feedback encouraging and constructive.

Return ONLY a valid JSON object matching this schema (NO markdown code fences, NO introductory text, NO extra commentary):
{
  "score": 1,
  "label": "Lost" | "Shaky" | "Getting there" | "Solid" | "Could teach it",
  "strengths": ["string"],
  "gaps": ["string"],
  "followup": "string",
  "summaryMessage": "string"
}`.trim();
}

/**
 * Safely parses LLM output into a validated ThinkBackEvaluation object.
 * Strips code fences, isolates JSON substrings, and applies schema defaults.
 */
export function safeParseThinkBackJson(
  rawText: string,
  topic = "Study Topic",
  learned = "",
  explain = "",
): ThinkBackEvaluation {
  try {
    let clean = rawText.trim();

    // Strip markdown code fences if model enclosed JSON
    if (clean.includes("```")) {
      clean = clean.replace(/```(?:json)?/gi, "").replace(/```/g, "");
    }

    // Isolate outer curly braces
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(clean);

    // Validate and clamp score
    const numScore = Number(parsed.score);
    const score = Math.max(1, Math.min(5, Math.round(Number.isFinite(numScore) ? numScore : 3)));
    const label =
      typeof parsed.label === "string" && parsed.label.trim()
        ? parsed.label.trim()
        : THINKBACK_LABELS[score] || "Getting there";

    const strengths: string[] = Array.isArray(parsed.strengths)
      ? parsed.strengths
          .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s: string) => s.trim())
      : [];

    const gaps: string[] = Array.isArray(parsed.gaps)
      ? parsed.gaps
          .filter((g: unknown): g is string => typeof g === "string" && g.trim().length > 0)
          .map((g: string) => g.trim())
      : [];

    const followup =
      typeof parsed.followup === "string" && parsed.followup.trim().length > 0
        ? parsed.followup.trim()
        : `How would you explain the core mechanism of ${topic} to someone who has never studied it?`;

    const summaryMessage =
      typeof parsed.summaryMessage === "string" && parsed.summaryMessage.trim().length > 0
        ? parsed.summaryMessage.trim()
        : `Your explanation shows a ${label.toLowerCase()} understanding of ${topic}.`;

    return {
      score,
      label,
      strengths: strengths.length > 0 ? strengths : ["Demonstrated self-study recall effort"],
      gaps: gaps.length > 0 ? gaps : ["Review key terminology and step-by-step details"],
      followup,
      summaryMessage,
    };
  } catch {
    // If JSON parsing fails, fall back to rubric-based heuristic evaluation
    return evaluateExplanationHeuristic(topic, learned, explain);
  }
}

/**
 * Intelligent, deterministic heuristic evaluator for offline/fallback mode.
 * Evaluates weak, average, and strong answers based on linguistic and conceptual markers.
 */
export function evaluateExplanationHeuristic(
  topic: string,
  learned: string,
  explain: string,
): ThinkBackEvaluation {
  const combined = `${learned} ${explain}`.trim();
  const words = combined.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = combined.toLowerCase();

  // 1. Weak markers (vagueness, filler, non-explanation)
  const vagueMarkers = [
    "stuff",
    "things",
    "i think",
    "not sure",
    "dont know",
    "don't know",
    "kinda",
    "dunno",
    "something like",
    "idk",
    "etc",
    "or whatever",
  ];
  const vagueMatches = vagueMarkers.filter((m) => lower.includes(m)).length;

  // 2. Strong causal & process connective markers
  const causalMarkers = [
    "because",
    "therefore",
    "splits",
    "produces",
    "converts",
    "generates",
    "stores",
    "mechanism",
    "process",
    "formula",
    "stage",
    "first",
    "then",
    "results in",
    "function",
    "leads to",
    "acts as",
    "consists of",
    "energy",
    "cycle",
    "reaction",
  ];
  const causalMatches = causalMarkers.filter((m) => lower.includes(m)).length;

  // 3. Technical vocabulary density & sentence complexity
  const sentences = combined.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLen = wordCount / Math.max(1, sentences.length);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  const lexicalDiversity = uniqueWords / Math.max(1, wordCount);

  // Scoring logic based on rubric:
  let score = 3;
  if (wordCount < 22 || vagueMatches >= 3 || (wordCount < 30 && causalMatches === 0)) {
    // Weak explanation
    score = wordCount < 18 || vagueMatches >= 4 ? 1 : 2;
  } else if (
    wordCount >= 45 &&
    causalMatches >= 3 &&
    vagueMatches === 0 &&
    lexicalDiversity > 0.6 &&
    avgSentenceLen >= 8
  ) {
    // Strong / Mastery explanation
    score = wordCount >= 70 && causalMatches >= 5 ? 5 : 4;
  } else if (wordCount >= 28 && causalMatches >= 1) {
    // Solid / Moderate
    score = causalMatches >= 3 && vagueMatches <= 1 ? 4 : 3;
  }

  const label = THINKBACK_LABELS[score] || "Getting there";

  // Derive strengths and gaps based on the score
  let strengths: string[] = [];
  let gaps: string[] = [];
  let followup = "";
  let summaryMessage = "";

  if (score <= 2) {
    strengths = [
      "Identified the basic subject matter",
      "Attempted recall without looking at notes",
    ];
    gaps = [
      "Explanation relies on vague generalizations ('stuff', 'things') rather than concrete steps",
      "Missing the exact causal mechanism explaining why and how this happens",
    ];
    followup = `What are the exact parts, steps, or components involved in ${topic || "this topic"}?`;
    summaryMessage =
      "You've recalled the general theme, but the explanation needs more precision and concrete steps.";
  } else if (score === 3) {
    strengths = [
      "Demonstrated good foundational understanding of the core concept",
      "Correctly outlined the overall purpose and primary outcome",
    ];
    gaps = [
      "Could elaborate more on intermediate steps between the starting state and final outcome",
      "Include key technical definitions or relevant formulas to make the explanation watertight",
    ];
    followup = `Can you describe what triggers the transition from the first stage to the next in ${topic || "this process"}?`;
    summaryMessage =
      "Good foundation! You have the key idea down, but adding intermediate details will solidify your mastery.";
  } else {
    strengths = [
      "Clearly articulated the step-by-step causal mechanism with strong connective reasoning",
      "Used accurate, precise terminology appropriate for the topic",
      "Demonstrated independent mastery by explaining the underlying 'why'",
    ];
    gaps =
      score === 5
        ? ["Consider boundary conditions or real-world exceptions to test edge-case mastery"]
        : ["Could briefly touch upon practical real-world applications or edge cases"];
    followup = `How would you connect this mechanism in ${topic || "this topic"} to real-world problem-solving or system design?`;
    summaryMessage =
      score === 5
        ? "Superb explanation! Your step-by-step reasoning and vocabulary show deep, teachable mastery."
        : "Solid work! Your explanation is well-structured, clear, and conceptually accurate.";
  }

  return {
    score,
    label,
    strengths,
    gaps,
    followup,
    summaryMessage,
  };
}

/**
 * Handles server-side evaluation using Gemini -> Ollama -> LM Studio -> Heuristic fallback
 */
export async function evaluateThinkBackSubmission(
  data: ThinkBackEvaluationRequest,
): Promise<ThinkBackServerResponse> {
  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
  const ollamaHost = process.env["OLLAMA_HOST"]?.trim() || "http://127.0.0.1:11434";
  const lmStudioHost = process.env["LM_STUDIO_HOST"]?.trim() || "http://127.0.0.1:1234";

  const prompt = buildThinkBackPrompt(data.topic, data.learned, data.explain);

  // 1. Try Google Gemini if API Key is configured
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const evalResult = safeParseThinkBackJson(text, data.topic, data.learned, data.explain);
          return {
            success: true,
            evaluation: evalResult,
            provider: "gemini",
          };
        }
      }
    } catch (err: unknown) {
      console.warn("ThinkBack Gemini API call failed, attempting fallback:", err);
    }
  }

  // 2. Try Local Ollama if available
  try {
    const ollamaCheck = await fetch(`${ollamaHost}/api/tags`, {
      signal: AbortSignal.timeout(1200),
    }).catch(() => null);

    if (ollamaCheck && ollamaCheck.ok) {
      const res = await fetch(`${ollamaHost}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env["OLLAMA_MODEL"] || "llama3",
          stream: false,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (res.ok) {
        const json = await res.json();
        const reply = json.message?.content;
        if (reply) {
          const evalResult = safeParseThinkBackJson(reply, data.topic, data.learned, data.explain);
          return {
            success: true,
            evaluation: evalResult,
            provider: "ollama",
          };
        }
      }
    }
  } catch {
    // Ollama not reachable
  }

  // 3. Try Local LM Studio if available
  try {
    const lmCheck = await fetch(`${lmStudioHost}/v1/models`, {
      signal: AbortSignal.timeout(1200),
    }).catch(() => null);

    if (lmCheck && lmCheck.ok) {
      const res = await fetch(`${lmStudioHost}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (res.ok) {
        const json = await res.json();
        const reply = json.choices?.[0]?.message?.content;
        if (reply) {
          const evalResult = safeParseThinkBackJson(reply, data.topic, data.learned, data.explain);
          return {
            success: true,
            evaluation: evalResult,
            provider: "lmstudio",
          };
        }
      }
    }
  } catch {
    // LM Studio not reachable
  }

  // 4. Reliable Heuristic Fallback (Ensures zero downtime, 100% demo reliability)
  const heuristicEval = evaluateExplanationHeuristic(data.topic, data.learned, data.explain);
  return {
    success: true,
    evaluation: heuristicEval,
    provider: "heuristic",
  };
}
