import { useState, useRef, type DragEvent } from "react";
import {
  FileText,
  Presentation,
  Image as ImageIcon,
  Camera,
  Youtube,
  PenTool,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileUp,
} from "lucide-react";
import { importFromFile, importFromYouTubeUrl, importFromRawText } from "@/lib/extractors";
import type { ImportedMaterial, MaterialType } from "@/lib/extractors/types";
import { CameraCaptureModal } from "./CameraCaptureModal";
import { btn } from "../AppShell";

type Props = {
  onMaterialImported: (material: ImportedMaterial) => void;
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".txt",
  ".md",
];

export function UploadZone({ onMaterialImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"files" | "camera" | "youtube" | "text">("files");

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & sub-flows
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // YouTube sub-flow
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [youtubePreview, setYoutubePreview] = useState<{
    title: string;
    thumbnailUrl: string;
    videoId: string;
  } | null>(null);

  // Text notes sub-flow
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // Process file upload
  const handleFileProcess = async (file: File, typeHint?: MaterialType) => {
    setErrorMessage(null);

    // Validation 1: Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is 50MB.`,
      );
      return;
    }

    // Validation 2: Extension
    const lowerName = file.name.toLowerCase();
    const isAllowed = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!isAllowed) {
      setErrorMessage(
        "Unsupported file format. Please upload a PDF, PowerPoint (.ppt, .pptx), or image (.jpg, .png, .webp).",
      );
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingMessage(`Reading ${file.name}...`);

    try {
      const material = await importFromFile(file, typeHint, (percent) => {
        setProcessingProgress(percent);
        if (percent < 40) setProcessingMessage("Loading document buffer...");
        else if (percent < 80) setProcessingMessage("Extracting text and structure...");
        else setProcessingMessage("Finalizing study notes...");
      });

      onMaterialImported(material);
      setProcessingProgress(100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process file.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        await handleFileProcess(file);
      }
    }
  };

  // YouTube submit
  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!youtubeUrl.trim()) return;

    setIsProcessing(true);
    setProcessingMessage("Fetching YouTube video details...");

    try {
      const material = await importFromYouTubeUrl(youtubeUrl.trim(), manualTranscript.trim());
      onMaterialImported(material);
      setYoutubeUrl("");
      setManualTranscript("");
      setYoutubePreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import YouTube video.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Text notes submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!noteContent.trim()) {
      setErrorMessage("Please enter or paste study notes before importing.");
      return;
    }

    try {
      const material = importFromRawText(noteContent.trim(), noteTitle.trim());
      onMaterialImported(material);
      setNoteTitle("");
      setNoteContent("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import text notes.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="card-soft overflow-hidden p-6 md:p-8">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-sage-deep">Smart Import Materials</h2>
          <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
            Upload course slides, PDFs, notes, YouTube lectures or snap a photo of whiteboard
            diagrams.
          </p>
        </div>

        {/* Input selection tabs */}
        <div className="flex flex-wrap gap-1 rounded-2xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "files"
                ? "bg-card text-sage-deep shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" /> File Upload
          </button>
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"
          >
            <Camera className="h-3.5 w-3.5" /> Camera
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("youtube")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "youtube"
                ? "bg-card text-sage-deep shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Youtube className="h-3.5 w-3.5 text-red-500" /> YouTube
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "text"
                ? "bg-card text-sage-deep shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenTool className="h-3.5 w-3.5" /> Paste Notes
          </button>
        </div>
      </div>

      {/* Error state alert */}
      {errorMessage && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive md:text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: FILE DRAG & DROP / SELECTION */}
      {activeTab === "files" && (
        <div className="mt-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition md:p-12 ${
              isDragOver
                ? "border-primary bg-primary/10 shadow-inner scale-[1.01]"
                : "border-lavender/60 bg-muted/30 hover:border-primary hover:bg-muted/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileProcess(file);
              }}
            />

            {/* Processing state indicator */}
            {isProcessing ? (
              <div className="flex flex-col items-center py-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 font-semibold text-sage-deep">{processingMessage}</p>
                <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-sage-gradient transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{processingProgress}% complete</p>
              </div>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary transition group-hover:scale-110">
                  <FileUp className="h-8 w-8" />
                </div>

                <p className="mt-4 font-display text-lg font-bold text-sage-deep md:text-xl">
                  Drag and drop your study materials here
                </p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground md:text-sm">
                  or click to browse from your device. Supports PDFs, PowerPoint presentations,
                  photos of handwritten notes, and text files.
                </p>

                {/* Formats pill row */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary" /> PDF
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                    <Presentation className="h-3.5 w-3.5 text-lavender" /> PPT / PPTX
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" /> Images (JPG, PNG, WEBP)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCameraOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-lavender bg-card px-3 py-1 text-xs font-bold text-sage-deep transition hover:bg-secondary"
                  >
                    <Camera className="h-3.5 w-3.5 text-primary" /> Live Camera
                  </button>
                </div>

                <p className="mt-4 text-[11px] text-muted-foreground">
                  Up to 50MB per file • Processed privately in your browser
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: YOUTUBE IMPORTER */}
      {activeTab === "youtube" && (
        <form onSubmit={handleYouTubeSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              YouTube Video URL
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="min-w-0 flex-1 rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={isProcessing || !youtubeUrl.trim()}
                className={btn.primary}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Youtube className="h-4 w-4" />
                )}
                Import Video
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Works with standard YouTube videos, YouTube Shorts, and shared links.
            </p>
          </div>

          {/* Transcript input */}
          <div className="rounded-2xl border border-dashed border-lavender bg-accent/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent-foreground">
                Paste Video Transcript or Lecture Notes (Optional)
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Transparent Data Policy
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              YouTube restricts direct in-browser caption scraping without a server proxy or API
              key. If you have the video transcript or your own lecture notes, paste them here to
              generate instant flashcards, quizzes, and summaries!
            </p>
            <textarea
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              rows={4}
              placeholder="Paste lecture transcript or key timestamps and bullet points here..."
              className="mt-3 w-full rounded-xl border bg-background p-3 text-sm focus:ring-2 focus:ring-primary"
            />
          </div>
        </form>
      )}

      {/* TAB 3: TEXT NOTES IMPORTER */}
      {activeTab === "text" && (
        <form onSubmit={handleTextSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Title (Optional)
            </label>
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Chapter 4: Photosynthesis & Calvin Cycle"
              className="mt-1.5 w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Study Notes or Article Content
            </label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={7}
              placeholder="Type or paste your notes, textbook summaries, definitions, or exam questions here..."
              className="mt-1.5 w-full rounded-2xl border bg-background p-4 text-sm focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {noteContent.split(/\s+/).filter(Boolean).length} words entered.
            </p>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={!noteContent.trim()} className={btn.primary}>
              <CheckCircle2 className="h-4 w-4" /> Import Notes
            </button>
          </div>
        </form>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => handleFileProcess(file, "camera")}
      />
    </div>
  );
}
