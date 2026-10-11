import { useState } from "react";
import type { ImportedMaterial } from "@/lib/extractors/types";
import { X, Check, RotateCcw, FileText, Sparkles } from "lucide-react";
import { btn } from "../AppShell";

type Props = {
  material: ImportedMaterial | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedText: string, updatedTitle: string) => void;
};

export function TextCorrectionModal({ material, isOpen, onClose, onSave }: Props) {
  if (!isOpen || !material) return null;

  return <TextCorrectionModalContent material={material} onClose={onClose} onSave={onSave} />;
}

function TextCorrectionModalContent({
  material,
  onClose,
  onSave,
}: {
  material: ImportedMaterial;
  onClose: () => void;
  onSave: (id: string, updatedText: string, updatedTitle: string) => void;
}) {
  const [text, setText] = useState(material.extractedText);
  const [title, setTitle] = useState(material.title);
  const [activeTab, setActiveTab] = useState<"editor" | "slides">("editor");

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const isDirty = text !== material.extractedText || title !== material.title;
  const hasSlides = material.metadata?.slides && material.metadata.slides.length > 0;

  const handleReset = () => {
    setText(material.originalText || material.extractedText);
    setTitle(material.title);
  };

  const handleSave = () => {
    onSave(material.id, text, title);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preview and Correct Extracted Text"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-rise"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-lavender/40 bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-bold text-sage-deep">
                Preview & Correct Extracted Text
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Review what was extracted from your material. Fix any OCR typos or format before
              generating study tools.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Title editing */}
        <div className="mt-4 flex items-center gap-2">
          <label className="text-xs font-bold text-muted-foreground">Title:</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-xl border bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary"
            placeholder="Material title"
          />
        </div>

        {/* Tabs for PPTX slides */}
        {hasSlides && (
          <div className="mt-3 flex gap-2 border-b pb-2">
            <button
              onClick={() => setActiveTab("editor")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                activeTab === "editor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Full Text Editor
            </button>
            <button
              onClick={() => setActiveTab("slides")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                activeTab === "slides"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Slide-by-Slide View ({material.metadata?.slides?.length} slides)
            </button>
          </div>
        )}

        {/* Body content */}
        <div className="my-4 flex-1 overflow-y-auto">
          {activeTab === "editor" ? (
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                className="w-full rounded-2xl border bg-background p-4 font-mono text-sm leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Extracted text will appear here..."
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{wordCount} words detected</span>
                <span>
                  Type: <strong className="uppercase">{material.type}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {material.metadata?.slides?.map((slide) => (
                <div key={slide.slideNumber} className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex items-center justify-between font-bold text-sage-deep">
                    <span>
                      Slide {slide.slideNumber}: {slide.title || "Untitled"}
                    </span>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                    {slide.text || "(No text on this slide)"}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Revert to original
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btn.soft}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className={btn.primary}>
              <Check className="h-4 w-4" /> Save Corrections
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
