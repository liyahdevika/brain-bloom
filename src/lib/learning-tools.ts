import type {
  GeneratedFlashcard,
  GeneratedLearningKit,
  GeneratedQuizQuestion,
  KeyConcept,
  PracticeQuestion,
  RevisionNotes,
  SimpleExplanation,
  StudyPlan,
  StudySummary,
  SupportedLanguage,
} from "./extractors/types";

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Splits text into individual sentences reliably
 */
export function tokenizeSentences(text: string): string[] {
  return text
    .replace(/([.?!])\s*(?=[A-Z0-9])/g, "$1|")
    .split("|")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 10 && !s.startsWith("http"));
}

/**
 * Extracts candidate concepts and definitions from text
 */
function extractConceptPairs(text: string): { term: string; definition: string }[] {
  const pairs: { term: string; definition: string }[] = [];
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Colon pattern: "Photosynthesis: The process by which..."
  for (const line of lines) {
    const colonMatch = line.match(/^([A-Za-z0-9\s-]{2,40}):\s+(.+)$/);
    if (colonMatch && colonMatch[1] && colonMatch[2]) {
      const term = colonMatch[1].trim();
      const def = colonMatch[2].trim();
      if (term.length > 2 && def.length > 10 && !term.toLowerCase().startsWith("http")) {
        pairs.push({ term, definition: def });
      }
    }
  }

  // 2. Definition verbs: "Photosynthesis is the process..." or "Mitochondria refers to..."
  const sentences = tokenizeSentences(text);
  const defRegex =
    /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+(?:is|refers to|means|is defined as|acts as)\s+(.+)/;

  for (const s of sentences) {
    const match = s.match(defRegex);
    if (match && match[1] && match[0]) {
      const term = match[1].trim();
      const definition = match[0].trim();
      if (!pairs.some((p) => p.term.toLowerCase() === term.toLowerCase())) {
        pairs.push({ term, definition });
      }
    }
  }

  // 3. Slide headings or bullet points
  for (const line of lines) {
    const bulletMatch = line.match(/^[•\-*#]+\s*([A-Za-z0-9\s-]{3,40})(?:[-–—]|:)\s*(.+)$/);
    if (bulletMatch && bulletMatch[1] && bulletMatch[2]) {
      const term = bulletMatch[1].trim();
      const def = bulletMatch[2].trim();
      if (!pairs.some((p) => p.term.toLowerCase() === term.toLowerCase())) {
        pairs.push({ term, definition: def });
      }
    }
  }

  // Fallback if few pairs found
  if (pairs.length === 0 && sentences.length > 0) {
    for (let i = 0; i < Math.min(sentences.length, 4); i++) {
      const s = sentences[i];
      if (!s) continue;
      const words = s.split(" ");
      const term = words.slice(0, Math.min(4, words.length)).join(" ");
      pairs.push({ term, definition: s });
    }
  }

  return pairs;
}

/**
 * Frequency-based keyword extractor
 */
function extractTopKeywords(text: string, count = 10): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "is",
    "in",
    "to",
    "of",
    "it",
    "with",
    "as",
    "for",
    "on",
    "that",
    "this",
    "by",
    "at",
    "from",
    "be",
    "are",
    "an",
    "was",
    "were",
    "or",
    "which",
    "into",
    "can",
    "has",
    "have",
    "had",
    "will",
    "would",
    "about",
    "more",
    "then",
    "them",
    "these",
    "some",
    "video",
    "channel",
    "notes",
    "slide",
    "slides",
    "chapter",
    "page",
    "http",
    "https",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const counts: Record<string, number> = {};
  for (const w of words) {
    counts[w] = (counts[w] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

// ==========================================
// 1. SUMMARISE
// ==========================================
export function generateSummary(text: string, lang: SupportedLanguage = "en"): StudySummary {
  const sentences = tokenizeSentences(text);

  if (sentences.length === 0) {
    return {
      overview:
        lang === "ml"
          ? "വിശകലനം ചെയ്യാൻ ആവശ്യമായ വിവരങ്ങൾ ലഭ്യമായിട്ടില്ല."
          : "No readable content found to summarise.",
      keyPoints: [],
      takeaway: "",
    };
  }

  const topPoints = sentences.slice(0, 5);
  const overviewSentence = sentences[0] || "";
  const lastSentence = sentences[sentences.length - 1] || overviewSentence;

  if (lang === "ml") {
    return {
      overview: `പഠന സാമഗ്രിയുടെ പ്രധാന സംഗ്രഹം: ${overviewSentence}`,
      keyPoints: topPoints.map((p, idx) => `കാര്യം ${idx + 1}: ${p}`),
      takeaway: `പ്രധാന പാഠം: പരീക്ഷയ്ക്കും റിവിഷനും ഈ ഭാഗങ്ങളിലെ അടിസ്ഥാന ആശയങ്ങൾ നന്നായി മനസ്സിലാക്കുക (${lastSentence.slice(0, 80)}...).`,
    };
  }

  return {
    overview: overviewSentence,
    keyPoints: topPoints,
    takeaway: `Key Takeaway: Master the core principles outlined above to understand the main application (${lastSentence.slice(0, 80)}...).`,
  };
}

// ==========================================
// 2. EXPLAIN IN SIMPLE BEGINNER-FRIENDLY LANGUAGE
// ==========================================
export function generateSimpleExplanation(
  text: string,
  lang: SupportedLanguage = "en",
): SimpleExplanation {
  const sentences = tokenizeSentences(text);
  const first = sentences[0] || "Core concept";
  const pairs = extractConceptPairs(text);
  const primaryTopic = pairs[0]?.term || "This topic";

  if (lang === "ml") {
    return {
      headline: `${primaryTopic} — ലളിതമായ വിശദീകരണം (തുടക്കക്കാർക്കായി)`,
      simpleBreakdown: [
        `എന്താണ് ഇത്: ${first}`,
        `എങ്ങനെ പ്രവർത്തിക്കുന്നു: സങ്കീർണ്ണമായ സൂത്രവാക്യങ്ങൾ കാണാതെ പഠിക്കുന്നതിനു പകരം ഇതിന്റെ പിന്നിലെ കാരണം ചിന്തിക്കുക.`,
        `ഓർമ്മിക്കാൻ എളുപ്പവഴി: ആദ്യം അടിസ്ഥാന തത്വം മനസ്സിലാക്കുക, തുടർന്ന് ചോദ്യങ്ങൾ സ്വയം ചെയ്തു ശീലിക്കുക.`,
      ],
      realWorldAnalogy: `ഉദാഹരണം: ഒരു വീട് പണിയുമ്പോൾ ആദ്യം അടിത്തറ ബലപ്പെടുത്തുന്നത് പോലെ, ഈ വിഷയത്തിലെ പ്രാഥമിക ആശയങ്ങൾ വ്യക്തമായാൽ ബാക്കി ഭാഗങ്ങൾ എളുപ്പത്തിൽ പഠിക്കാം.`,
      keyRule: `പ്രധാന നിയമം: തിയറി വായിച്ച ശേഷം സ്വന്തം വാക്കുകളിൽ ചുരുക്കി എഴുതുക (ThinkBack).`,
    };
  }

  return {
    headline: `Simple Explanation: Understanding ${primaryTopic}`,
    simpleBreakdown: [
      `What it means in plain English: ${first}`,
      `How it works step-by-step: Break it into small building blocks instead of memorising long blocks of text.`,
      `Why it matters: Once you understand the fundamental mechanism, answering exam questions becomes straightforward.`,
    ],
    realWorldAnalogy: `Analogy: Think of it like learning how a bicycle works — once you see how pedals turn the gears, you don't need to memorise which direction the wheel spins.`,
    keyRule: `Golden Rule: Always test yourself by explaining this concept without looking at the notes (Active Recall).`,
  };
}

// ==========================================
// 3. GENERATE FLASHCARDS
// ==========================================
export function generateFlashcards(
  text: string,
  lang: SupportedLanguage = "en",
): GeneratedFlashcard[] {
  const pairs = extractConceptPairs(text);
  const cards: GeneratedFlashcard[] = [];

  for (let i = 0; i < Math.min(pairs.length, 8); i++) {
    const pair = pairs[i];
    if (!pair) continue;
    const difficulty: "easy" | "medium" | "hard" =
      i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard";

    if (lang === "ml") {
      cards.push({
        id: uid(),
        question: `എന്താണ് ${pair.term}?`,
        answer: pair.definition,
        concept: pair.term,
        difficulty,
      });
    } else {
      cards.push({
        id: uid(),
        question: `What is ${pair.term}?`,
        answer: pair.definition,
        concept: pair.term,
        difficulty,
      });
    }
  }

  // If text was short, generate at least 2 general recall cards
  if (cards.length === 0) {
    const sentences = tokenizeSentences(text);
    if (sentences.length > 0 && sentences[0]) {
      cards.push({
        id: uid(),
        question:
          lang === "ml"
            ? "ഈ പാഠഭാഗത്തിലെ പ്രധാന ആശയം എന്താണ്?"
            : "What is the primary topic discussed in this material?",
        answer: sentences[0],
        concept: "Core Overview",
        difficulty: "easy",
      });
    }
  }

  return cards;
}

// ==========================================
// 4. GENERATE QUIZ
// ==========================================
export function generateQuiz(
  text: string,
  lang: SupportedLanguage = "en",
): GeneratedQuizQuestion[] {
  const pairs = extractConceptPairs(text);
  const keywords = extractTopKeywords(text, 12);
  const questions: GeneratedQuizQuestion[] = [];

  for (let i = 0; i < Math.min(pairs.length, 5); i++) {
    const current = pairs[i];
    if (!current) continue;
    const otherDefs = pairs.filter((_, idx) => idx !== i).map((p) => p.definition);
    const fallbackDistractors = [
      "A temporary condition caused by environmental noise and external factors.",
      "An unrelated mathematical constant used in advanced calculus.",
      "None of the provided options accurately describe this concept.",
    ];

    const options: string[] = [
      current.definition,
      otherDefs[0] ?? fallbackDistractors[0]!,
      otherDefs[1] ?? fallbackDistractors[1]!,
      fallbackDistractors[2]!,
    ];

    // Shuffle options and find index of correct answer
    const shuffled = [...options].sort(() => 0.5 - Math.random());
    const correctIndex = shuffled.indexOf(current.definition);

    if (lang === "ml") {
      questions.push({
        id: uid(),
        question: `താഴെ പറയുന്നവയിൽ '${current.term}' എന്നതിന് ഏറ്റവും അനുയോജ്യമായ വിവരണം ഏതാണ്?`,
        options: shuffled,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation: `'${current.term}' എന്നത്: ${current.definition}`,
      });
    } else {
      questions.push({
        id: uid(),
        question: `Which of the following best defines '${current.term}'?`,
        options: shuffled,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation: `'${current.term}' correctly refers to: ${current.definition}`,
      });
    }
  }

  // Fallback question if no pairs existed
  if (questions.length === 0) {
    const kw = keywords[0] || "Key Term";
    questions.push({
      id: uid(),
      question:
        lang === "ml"
          ? `ഈ കുറിപ്പുകളിൽ പരാമർശിച്ചിരിക്കുന്ന പ്രധാന വിഷയം ഏതാണ്?`
          : `Which topic is predominantly discussed in the imported material?`,
      options: [
        kw,
        "General unrelated science trivia",
        "Historical chronological dates",
        "None of the above",
      ],
      correctIndex: 0,
      explanation:
        lang === "ml"
          ? `${kw} ആണ് പ്രധാന വിഷയം.`
          : `${kw} is the core subject extracted from your text.`,
    });
  }

  return questions;
}

// ==========================================
// 5. CREATE REVISION NOTES
// ==========================================
export function generateRevisionNotes(text: string, lang: SupportedLanguage = "en"): RevisionNotes {
  const sentences = tokenizeSentences(text);
  const pairs = extractConceptPairs(text);
  const title = pairs[0]?.term ? `Revision Notes: ${pairs[0].term}` : "Fast Revision Notes";

  const coreBullets = sentences.slice(0, 4);
  const appBullets = sentences.slice(4, 8);

  if (lang === "ml") {
    return {
      title: `പുനരവലോകന കുറിപ്പുകൾ (Revision Notes)`,
      sections: [
        {
          heading: "1. പ്രധാന തത്വങ്ങൾ (Core Principles)",
          bullets: coreBullets.length
            ? coreBullets
            : ["ആശയങ്ങൾ വ്യക്തമായി വായിച്ചു മനസ്സിലാക്കുക."],
        },
        {
          heading: "2. വിശദാംശങ്ങളും ഉദാഹരണങ്ങളും",
          bullets: appBullets.length ? appBullets : ["തുടർ ചോദ്യങ്ങൾ പരിശീലിക്കുക."],
        },
      ],
      formulasOrRules: [
        "റൂൾ 1: നിർവ്വചനങ്ങളും പ്രധാന പദങ്ങളും എഴുതി നോക്കുക.",
        "റൂൾ 2: ഓരോ സ്ലൈഡിലെയും/പേജിലെയും കേന്ദ്ര ആശയം ചുരുക്കി എഴുതുക.",
      ],
      examChecklist: [
        "പ്രധാന ഫോർമുലകളും നിർവചനങ്ങളും മനഃപാഠമാണോ?",
        "സ്വന്തം വാക്കുകളിൽ ഇത് മറ്റൊരാൾക്ക് വിശദീകരിക്കാൻ കഴിയുമോ?",
        "ക്വിസ് പരിശീലനത്തിൽ മുഴുവൻ മാർക്കും നേടാൻ കഴിഞ്ഞോ?",
      ],
    };
  }

  return {
    title,
    sections: [
      {
        heading: "1. Core Principles & Overview",
        bullets: coreBullets.length
          ? coreBullets
          : ["Key facts and foundations extracted from material."],
      },
      {
        heading: "2. Key Details & Application",
        bullets: appBullets.length
          ? appBullets
          : ["Operational specifics and secondary explanations."],
      },
    ],
    formulasOrRules: [
      "Rule 1: Always verify assumptions against base definitions.",
      "Rule 2: Active recall provides 3x higher long-term retention than passive reading.",
    ],
    examChecklist: [
      "Can you define all extracted terminology from memory?",
      "Have you completed the self-test quiz questions?",
      "Did you review the hard flashcard items?",
    ],
  };
}

// ==========================================
// 6. EXTRACT IMPORTANT CONCEPTS AND KEYWORDS
// ==========================================
export function generateKeyConcepts(text: string, lang: SupportedLanguage = "en"): KeyConcept[] {
  const pairs = extractConceptPairs(text);
  const keywords = extractTopKeywords(text, 10);
  const concepts: KeyConcept[] = [];

  for (const pair of pairs.slice(0, 8)) {
    concepts.push({
      term: pair.term,
      definition: pair.definition,
      importance: "high",
    });
  }

  for (const kw of keywords) {
    if (!concepts.some((c) => c.term.toLowerCase() === kw.toLowerCase())) {
      concepts.push({
        term: kw,
        definition:
          lang === "ml"
            ? `ഈ പഠന സാമഗ്രിയിൽ ആവർത്തിച്ചു പരാമർശിച്ചിരിക്കുന്ന പ്രധാന പദം.`
            : `Frequently referenced domain term in the imported study notes.`,
        importance: "medium",
      });
    }
  }

  return concepts.slice(0, 10);
}

// ==========================================
// 7. GENERATE PRACTICE QUESTIONS
// ==========================================
export function generatePracticeQuestions(
  text: string,
  lang: SupportedLanguage = "en",
): PracticeQuestion[] {
  const pairs = extractConceptPairs(text);
  const sentences = tokenizeSentences(text);
  const questions: PracticeQuestion[] = [];

  if (pairs.length > 0 && pairs[0]) {
    const p1 = pairs[0];
    questions.push({
      id: uid(),
      type: "concept",
      question:
        lang === "ml"
          ? `'${p1.term}' എന്ന ആശയം സ്വന്തം വാക്കുകളിൽ വിവരിക്കുക.`
          : `Explain the concept of '${p1.term}' in your own words without checking your notes.`,
      sampleAnswer: p1.definition,
      hint:
        lang === "ml"
          ? "നിർവചനത്തിലെ പ്രധാന വാക്കുകൾ ഓർത്തെടുക്കുക."
          : "Think about the primary mechanism and purpose.",
    });
  }

  if (pairs.length > 1 && pairs[1]) {
    const p2 = pairs[1];
    questions.push({
      id: uid(),
      type: "application",
      question:
        lang === "ml"
          ? `'${p2.term}' യഥാർത്ഥ ജീവിതത്തിലോ പരീക്ഷയിലോ എങ്ങനെ പ്രയോഗിക്കാം?`
          : `How does '${p2.term}' apply in practical scenarios or exam problem-solving?`,
      sampleAnswer: p2.definition,
      hint: lang === "ml" ? "ഉദാഹരണങ്ങൾ സഹിതം ചിന്തിക്കുക." : "Consider a real-world example.",
    });
  }

  if (sentences.length > 2 && (sentences[1] || sentences[0])) {
    const sampleAnswer = sentences[1] || sentences[0] || "";
    questions.push({
      id: uid(),
      type: "short",
      question:
        lang === "ml"
          ? `ഈ വിഷയത്തിലെ ഏറ്റവും നിർണായകമായ ഘടകം എന്താണ്?`
          : `What is the most critical takeaway regarding this topic?`,
      sampleAnswer,
      hint:
        lang === "ml"
          ? "ആദ്യ ഖണ്ഡികയിലെ കേന്ദ്ര ആശയം പരിശോധിക്കുക."
          : "Refer to the summary statement.",
    });
  }

  return questions;
}

// ==========================================
// 8. CREATE STUDY PLAN BASED ON MATERIAL
// ==========================================
export function generateStudyPlan(text: string, lang: SupportedLanguage = "en"): StudyPlan {
  const words = text.split(/\s+/).filter(Boolean).length;
  const estimatedReadMin = Math.max(5, Math.ceil(words / 150));
  const pairs = extractConceptPairs(text);
  const topTopics =
    pairs
      .slice(0, 3)
      .map((p) => p.term)
      .join(", ") || "Core Concepts";

  if (lang === "ml") {
    return {
      durationDays: 3,
      schedule: [
        {
          day: 1,
          title: "ദിവസം 1: അടിസ്ഥാന ആശയങ്ങളും ധാരണയും",
          focus: `പഠന സാമഗ്രി വായിക്കുക (${estimatedReadMin} മിനിറ്റ്) + പ്രധാന നിർവചനങ്ങൾ അടയാളപ്പെടുത്തുക (${topTopics}).`,
          tasks: [
            "കുറിപ്പുകൾ ഒരു തവണ ശ്രദ്ധയോടെ വായിക്കുക",
            "ഫ്ലാഷ് കാർഡുകൾ ആദ്യ റൗണ്ട് പരിശീലിക്കുക",
          ],
          estimatedMinutes: 25,
        },
        {
          day: 2,
          title: "ദിവസം 2: ആഴത്തിലുള്ള പരിശീലനവും ക്വിസ്സും",
          focus: "ആക്ടീവ് റീകോൾ (Active Recall) വഴി സ്വയം പരിശോധിക്കുക.",
          tasks: [
            "ക്വിസ് എഴുതുക, തെറ്റിയ ഉത്തരങ്ങളുടെ വിശദീകരണം വായിക്കുക",
            "പരിശീലന ചോദ്യങ്ങൾക്ക് സ്വന്തം വാക്കുകളിൽ ഉത്തരം നൽകുക",
          ],
          estimatedMinutes: 30,
        },
        {
          day: 3,
          title: "ദിവസം 3: റിവിഷനും ഉറപ്പിക്കലും",
          focus:
            "പരീക്ഷാ ചെക്ക്‌ലിസ്റ്റ് പരിശോധിക്കുകയും ബുദ്ധിമുട്ടുള്ള ഫ്ലാഷ് കാർഡുകൾ വീണ്ടും പരിശീലിക്കുകയും ചെയ്യുക.",
          tasks: [
            "ഹാർഡ് (Hard) കാർഡുകൾ പൂർത്തിയാക്കുക",
            "ThinkBack വഴി സ്വന്തം വിശദീകരണം തയ്യാറാക്കുക",
          ],
          estimatedMinutes: 20,
        },
      ],
      advice:
        "ദിവസവും കുറഞ്ഞ സമയം ശ്രദ്ധയോടെ പഠിക്കുന്നത് പരീക്ഷയ്ക്ക് തലേദിവസം ഒന്നിച്ച് പഠിക്കുന്നതിനേക്കാൾ ഫലപ്രദമാണ്.",
    };
  }

  return {
    durationDays: 3,
    schedule: [
      {
        day: 1,
        title: "Day 1: Foundation & Comprehension",
        focus: `Read and absorb material (~${estimatedReadMin} min) and identify primary principles (${topTopics}).`,
        tasks: [
          "Read through extracted text and verify key terminology",
          "Complete first round of Flashcards (mark hard items)",
        ],
        estimatedMinutes: 25,
      },
      {
        day: 2,
        title: "Day 2: Active Recall & Problem Solving",
        focus: "Test your retention through retrieval practice instead of passive re-reading.",
        tasks: [
          "Take the multiple-choice quiz and review explanation reasoning",
          "Attempt the practice questions without referencing notes",
        ],
        estimatedMinutes: 30,
      },
      {
        day: 3,
        title: "Day 3: Mastery & ThinkBack Reflection",
        focus: "Consolidate learning into long-term memory.",
        tasks: [
          "Review the hard flashcard queue in BrainBloom",
          "Write a 20-word ThinkBack reflection in your own words to lock in XP",
        ],
        estimatedMinutes: 20,
      },
    ],
    advice:
      "Spacing your study sessions across 3 days yields dramatically stronger exam retention than single-session cramming.",
  };
}

/**
 * Master generator for all learning tools
 */
export function generateLearningKit(
  materialId: string,
  text: string,
  lang: SupportedLanguage = "en",
): GeneratedLearningKit {
  return {
    materialId,
    language: lang,
    summary: generateSummary(text, lang),
    simpleExplanation: generateSimpleExplanation(text, lang),
    flashcards: generateFlashcards(text, lang),
    quiz: generateQuiz(text, lang),
    revisionNotes: generateRevisionNotes(text, lang),
    concepts: generateKeyConcepts(text, lang),
    practiceQuestions: generatePracticeQuestions(text, lang),
    studyPlan: generateStudyPlan(text, lang),
    generatedAt: new Date().toISOString(),
  };
}
