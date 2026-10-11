import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { ImportedMaterial, MaterialType } from "@/lib/extractors/types";
import {
  FileText,
  Presentation,
  Image as ImageIcon,
  Camera,
  Youtube,
  Trash2,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  MessageCircle,
} from "lucide-react";

type Props = {
  materials: ImportedMaterial[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onInspectText: (material: ImportedMaterial) => void;
  onReplaceFile: (id: string, file: File) => void;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "Web URL / Text";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const TYPE_ICONS: Record<MaterialType, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  ppt: Presentation,
  image: ImageIcon,
  camera: Camera,
  youtube: Youtube,
  text: Edit3,
};

export function MaterialShelf({
  materials,
  selectedId,
  onSelect,
  onRemove,
  onInspectText,
  onReplaceFile,
}: Props) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replacingIdRef = useRef<string | null>(null);

  const handleReplaceClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    replacingIdRef.current = id;
    replaceInputRef.current?.click();
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replacingIdRef.current) {
      onReplaceFile(replacingIdRef.current, file);
      replacingIdRef.current = null;
    }
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  };

  if (materials.length === 0) {
    return (
      <div className="card-soft mt-6 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Sparkles className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-sage-deep">
          No materials imported yet
        </h3>
        <p className="mt-1 text-xs text-muted-foreground md:text-sm">
          Drop a PDF, presentation, photo, YouTube video or paste your notes above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between pb-3">
        <h3 className="font-display text-xl font-bold text-sage-deep">
          Imported Materials ({materials.length})
        </h3>
        <span className="text-xs text-muted-foreground">
          Click an item to view or generate study tools
        </span>
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt"
        className="hidden"
        onChange={handleFilePicked}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {materials.map((mat) => {
          const Icon = TYPE_ICONS[mat.type] || FileText;
          const isSelected = mat.id === selectedId;

          return (
            <div
              key={mat.id}
              onClick={() => onSelect(mat.id)}
              className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-secondary/30 ring-2 ring-primary/40 shadow-md"
                  : "border-lavender/40 bg-card hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <div>
                {/* Header row: Preview/Icon & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {mat.previewUrl ? (
                      <img
                        src={mat.previewUrl}
                        alt={mat.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon className="h-6 w-6 text-primary" />
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-1">
                    {mat.status === "ready" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-sage-deep">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> Ready
                      </span>
                    )}
                    {mat.status === "processing" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                        <Clock className="h-3 w-3 animate-spin" /> Processing
                      </span>
                    )}
                    {mat.status === "error" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[10px] font-bold text-destructive">
                        <AlertCircle className="h-3 w-3" /> Error
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & metadata */}
                <div className="mt-3">
                  <h4 className="line-clamp-2 font-display text-sm font-bold text-sage-deep group-hover:text-primary">
                    {mat.title}
                  </h4>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold uppercase">{mat.type}</span>
                    <span>•</span>
                    <span>{formatBytes(mat.sizeBytes)}</span>
                    {mat.metadata?.pageCount && (
                      <>
                        <span>•</span>
                        <span>{mat.metadata.pageCount} pages</span>
                      </>
                    )}
                    {mat.metadata?.slideCount && (
                      <>
                        <span>•</span>
                        <span>{mat.metadata.slideCount} slides</span>
                      </>
                    )}
                    {mat.metadata?.wordCount !== undefined && (
                      <>
                        <span>•</span>
                        <span>{mat.metadata.wordCount} words</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectText(mat);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary transition hover:bg-primary/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <Link
                    to="/tutor"
                    search={{ materialId: mat.id }}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-accent-foreground transition hover:bg-accent/40"
                    title="Ask BloomBuddy AI about this material"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-lavender" /> Ask AI
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleReplaceClick(e, mat.id)}
                    aria-label="Replace material"
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    title="Replace with new file"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(mat.id);
                    }}
                    aria-label="Remove material"
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
