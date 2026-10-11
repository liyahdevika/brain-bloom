import type { BloomBuddyPreferences } from "@/lib/ai/types";
import { useImport } from "@/lib/import-store";
import {
  Globe,
  Gauge,
  HelpCircle,
  FileText,
  BrainCircuit,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
} from "lucide-react";

type Props = {
  preferences: BloomBuddyPreferences;
  onChange: (patch: Partial<BloomBuddyPreferences>) => void;
  className?: string;
};

export function BloomBuddyControls({ preferences, onChange, className = "" }: Props) {
  const { materials } = useImport();
  const selectedMaterial = materials.find((m) => m.id === preferences.activeMaterialId);

  return (
    <div className={`space-y-4 rounded-3xl border border-lavender/50 bg-card p-5 ${className}`}>
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-sage-deep">
            Study Preferences & Context
          </h3>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-sage-deep">
          Customized
        </span>
      </div>

      {/* 1. UPLOADED MATERIAL CONTEXT SELECTOR */}
      <div>
        <label className="flex items-center justify-between text-xs font-bold text-sage-deep">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" /> Chat With Material
          </span>
          <span className="text-[10px] font-normal text-muted-foreground">
            Smart Import Context
          </span>
        </label>
        <div className="relative mt-1.5">
          <select
            value={preferences.activeMaterialId || ""}
            onChange={(e) => onChange({ activeMaterialId: e.target.value || null })}
            className="w-full appearance-none rounded-2xl border bg-background px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">None (General Study Assistant)</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                📄 {m.title} ({m.type.toUpperCase()})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        {selectedMaterial ? (
          <div className="mt-2 rounded-xl bg-secondary/40 p-2.5 text-[11px] text-sage-deep">
            <span className="font-bold">Active context:</span> {selectedMaterial.title}
            <div className="mt-0.5 flex gap-2 text-[10px] opacity-80">
              <span>{selectedMaterial.metadata?.wordCount || 0} words</span>
              {selectedMaterial.metadata?.slideCount && (
                <span>• {selectedMaterial.metadata.slideCount} slides</span>
              )}
              {selectedMaterial.metadata?.pageCount && (
                <span>• {selectedMaterial.metadata.pageCount} pages</span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Upload PDFs, slides, or notes in Smart Import to discuss them here.
          </p>
        )}
      </div>

      {/* 2. PREFERRED LANGUAGE */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-sage-deep">
          <Globe className="h-3.5 w-3.5 text-primary" /> Preferred Language
        </label>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ language: "en" })}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              preferences.language === "en"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onChange({ language: "ml" })}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              preferences.language === "ml"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            മലയാളം (Malayalam)
          </button>
        </div>
      </div>

      {/* 3. EXPLANATION LEVEL */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-sage-deep">
          <Gauge className="h-3.5 w-3.5 text-primary" /> Explanation Level
        </label>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {[
            { id: "beginner", label: "Beginner" },
            { id: "intermediate", label: "Medium" },
            { id: "advanced", label: "Advanced" },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                onChange({ explanationLevel: id as BloomBuddyPreferences["explanationLevel"] })
              }
              className={`rounded-xl py-1.5 text-center text-xs font-bold transition ${
                preferences.explanationLevel === id
                  ? "bg-secondary text-sage-deep ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. ANSWER STYLE */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-sage-deep">
          <HelpCircle className="h-3.5 w-3.5 text-primary" /> Teaching Style
        </label>
        <div className="mt-1.5 space-y-1">
          {[
            {
              id: "hints_first",
              label: "Hints first (Socratic)",
              desc: "Nudges you to think before full answer",
            },
            {
              id: "step_by_step",
              label: "Step-by-step",
              desc: "Detailed milestones for code & math",
            },
            { id: "quick", label: "Quick summary", desc: "Concise, high-yield overview" },
          ].map(({ id, label, desc }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ answerStyle: id as BloomBuddyPreferences["answerStyle"] })}
              className={`w-full rounded-xl p-2 text-left text-xs transition ${
                preferences.answerStyle === id
                  ? "border border-primary bg-secondary/50 font-bold text-sage-deep"
                  : "border border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <div>{label}</div>
              <div className="text-[10px] font-normal opacity-80">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. THINK FIRST MODE TOGGLE */}
      <div className="rounded-2xl border border-lavender/60 bg-accent/30 p-3">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={preferences.thinkFirstMode}
            onChange={(e) => onChange({ thinkFirstMode: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded accent-primary"
          />
          <div>
            <span className="flex items-center gap-1 text-xs font-bold text-accent-foreground">
              <BrainCircuit className="h-3.5 w-3.5" /> Think First Mode
            </span>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              BloomBuddy will prompt you to type what you already think before revealing full
              solutions.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
