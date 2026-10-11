import { useState, useRef, useEffect } from "react";
import type { ChatMessage, BloomBuddyPreferences } from "@/lib/ai/types";
import { askBloomBuddy } from "@/lib/ai/server";
import { useImport } from "@/lib/import-store";
import {
  Send,
  Square,
  RotateCcw,
  Trash2,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  FileText,
  Key,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
} from "lucide-react";
import { btn } from "../AppShell";

type Props = {
  preferences: BloomBuddyPreferences;
};

const SUGGESTED_STARTERS = [
  "Explain recursion in programming using a simple analogy.",
  "Give me 3 practice questions with hints on this topic.",
  "How does time complexity Big-O work in plain English?",
  "Summarise the key points from my uploaded material.",
];

export function BloomBuddyChat({ preferences }: Props) {
  const { materials } = useImport();
  const selectedMaterial = materials.find((m) => m.id === preferences.activeMaterialId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [studentAttempt, setStudentAttempt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [setupNotice, setSetupNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).slice(2, 10),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      thinkFirstPrompt: studentAttempt.trim() || undefined,
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInputText("");
    setStudentAttempt("");
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await askBloomBuddy({
        data: {
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          preferences,
          documentContext: selectedMaterial
            ? {
                materialTitle: selectedMaterial.title,
                materialType: selectedMaterial.type,
                extractedText: selectedMaterial.extractedText,
                slideCount: selectedMaterial.metadata?.slideCount,
                pageCount: selectedMaterial.metadata?.pageCount,
              }
            : null,
          studentAttempt: userMessage.thinkFirstPrompt,
        },
      });

      if (!response.configured) {
        setSetupNotice(response.setupInstructions || "No model configured");
      }

      if (response.success && response.reply) {
        const aiMessage: ChatMessage = {
          id: Math.random().toString(36).slice(2, 10),
          role: "assistant",
          content: response.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sourceContext: selectedMaterial
            ? {
                materialId: selectedMaterial.id,
                materialTitle: selectedMaterial.title,
                slideNumber: (() => {
                  const citation = response.sourceCitations?.[0]?.label;
                  const match = citation?.match(/Slide (\d+)/);
                  return match && match[1] ? parseInt(match[1], 10) : undefined;
                })(),
                isDocumentGrounded: true,
              }
            : undefined,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorMsg: ChatMessage = {
          id: Math.random().toString(36).slice(2, 10),
          role: "assistant",
          content:
            response.errorMessage ||
            response.reply ||
            "Could not connect to AI service. Please check your network or configuration.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).slice(2, 10),
            role: "assistant",
            content: "Generation stopped.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        const msg = err instanceof Error ? err.message : "Network error";
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).slice(2, 10),
            role: "assistant",
            content: `Failed to receive answer: ${msg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isError: true,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const handleRetry = (msgIndex: number) => {
    const prevUserMsg = messages
      .slice(0, msgIndex)
      .reverse()
      .find((m) => m.role === "user");
    if (prevUserMsg) {
      // Remove failed message and retry
      setMessages((prev) => prev.slice(0, msgIndex));
      handleSend(prevUserMsg.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSetupNotice(null);
  };

  return (
    <div className="card-soft flex min-h-[38rem] flex-col overflow-hidden p-4 md:p-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-sage-deep">BloomBuddy AI</h3>
            <p className="text-[11px] text-muted-foreground">
              {selectedMaterial ? (
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <FileText className="h-3 w-3" /> Discussing: {selectedMaterial.title}
                </span>
              ) : (
                "Your friendly, supportive study buddy"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Setup Instructions Card if no model is configured */}
      {setupNotice && (
        <div className="mt-3 rounded-2xl border border-dashed border-lavender bg-accent/40 p-4 text-xs text-accent-foreground">
          <div className="flex items-start gap-2">
            <Key className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1 space-y-1">
              <p className="font-bold">Connect Live AI Model (Free & Secure):</p>
              <p className="leading-relaxed">
                Add{" "}
                <code className="rounded bg-card px-1 py-0.5 font-mono">
                  GEMINI_API_KEY=your_key
                </code>{" "}
                into your server <code className="rounded bg-card px-1 py-0.5 font-mono">.env</code>{" "}
                file.
              </p>
              <div className="pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                >
                  Get free key from Google AI Studio <ExternalLink className="h-3 w-3" />
                </a>
                <span className="mx-2 opacity-50">•</span>
                <span>Zero credit card required</span>
              </div>
            </div>
            <button
              onClick={() => setSetupNotice(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Stream */}
      <div className="my-4 flex-1 space-y-4 overflow-y-auto px-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <h4 className="mt-4 font-display text-xl font-bold text-sage-deep">
              How can BloomBuddy help you learn today?
            </h4>
            <p className="mt-1 max-w-md text-xs text-muted-foreground md:text-sm">
              Ask questions about programming, mathematics, or your uploaded documents. BloomBuddy
              gives gentle hints and step-by-step guidance!
            </p>

            {/* Suggested Starter Questions */}
            <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SUGGESTED_STARTERS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="rounded-2xl border border-lavender/40 bg-card p-3 text-left text-xs font-semibold text-sage-deep transition hover:border-primary hover:bg-secondary/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-tr-sm bg-sage-gradient text-primary-foreground shadow-sm"
                  : m.isError
                    ? "rounded-tl-sm border border-destructive/20 bg-destructive/10 text-destructive"
                    : "rounded-tl-sm border border-lavender/40 bg-card text-foreground shadow-xs"
              }`}
            >
              {/* Think First user badge */}
              {m.thinkFirstPrompt && (
                <div className="mb-2 rounded-xl bg-card/20 p-2 text-xs">
                  <span className="font-bold opacity-80">💭 My thinking first:</span>{" "}
                  {m.thinkFirstPrompt}
                </div>
              )}

              {/* Document grounded badge */}
              {m.sourceContext && (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-sage-deep">
                  <FileText className="h-3 w-3 text-primary" />
                  <span>Based on: {m.sourceContext.materialTitle}</span>
                  {m.sourceContext.slideNumber && (
                    <span>• Slide {m.sourceContext.slideNumber}</span>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="whitespace-pre-wrap">{m.content}</div>

              <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-70">
                <span>{m.timestamp}</span>
                {m.isError && (
                  <button
                    type="button"
                    onClick={() => handleRetry(idx)}
                    className="inline-flex items-center gap-1 font-bold underline"
                  >
                    <RotateCcw className="h-3 w-3" /> Retry
                  </button>
                )}
              </div>
            </div>

            {m.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sage-deep">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading / Typing Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-3xl border border-lavender/40 bg-card px-4 py-3 text-xs text-muted-foreground shadow-xs">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0.4s]" />
              </span>
              <span>BloomBuddy is thinking...</span>
            </div>
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Stop generating"
            >
              <Square className="h-3 w-3 fill-current" /> Stop
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t pt-3">
        {/* Think First prompt drawer */}
        {preferences.thinkFirstMode && (
          <div className="mb-2 rounded-2xl border border-dashed border-lavender bg-accent/20 p-2.5">
            <label className="flex items-center gap-1 text-[11px] font-bold text-accent-foreground">
              <Brain className="h-3 w-3" /> Think First: What do you think the answer or approach
              is? (Optional)
            </label>
            <input
              value={studentAttempt}
              onChange={(e) => setStudentAttempt(e.target.value)}
              placeholder="e.g. I think we need to divide the array in half each time..."
              className="mt-1 w-full rounded-xl border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={
              preferences.language === "ml"
                ? "ചോദ്യം ഇവിടെ ടൈപ്പ് ചെയ്യുക... (Enter to send, Shift+Enter for new line)"
                : "Ask BloomBuddy anything... (Enter to send, Shift+Enter for new line)"
            }
            className="min-h-11 flex-1 resize-none rounded-2xl border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground shadow-md transition hover:opacity-90"
              title="Stop generating"
            >
              <Square className="h-5 w-5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!inputText.trim()}
              onClick={() => handleSend()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-gradient text-primary-foreground shadow-md transition hover:opacity-90 disabled:opacity-40"
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
