import { useEffect, useRef, useState } from "react";
import { CameraController } from "@/lib/extractors/image-extractor";
import { Camera, RefreshCw, X, AlertCircle, Upload } from "lucide-react";
import { btn } from "../AppShell";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export function CameraCaptureModal({ isOpen, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<CameraController | null>(null);

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (controllerRef.current) {
        controllerRef.current.stopCamera();
        controllerRef.current = null;
      }
      setActive(false);
      setError(null);
      return;
    }

    const start = async () => {
      setError(null);
      const ctrl = new CameraController();
      controllerRef.current = ctrl;

      try {
        if (videoRef.current) {
          await ctrl.startCamera(videoRef.current);
          setActive(true);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    };

    // Slight delay to allow modal DOM rendering
    const timer = setTimeout(start, 100);
    return () => {
      clearTimeout(timer);
      if (controllerRef.current) {
        controllerRef.current.stopCamera();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSnap = () => {
    if (!videoRef.current || !controllerRef.current) return;
    setCapturing(true);
    try {
      const file = controllerRef.current.captureSnapshot(videoRef.current);
      controllerRef.current.stopCamera();
      onCapture(file);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to capture snapshot");
    } finally {
      setCapturing(false);
    }
  };

  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (controllerRef.current) controllerRef.current.stopCamera();
      onCapture(file);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camera Capture"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-rise"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-lavender/30 bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <h3 className="font-display text-xl font-bold text-sage-deep">
              Scan Notes with Camera
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close camera"
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          Point your camera directly at handwritten notes, textbook paragraphs, or whiteboard
          equations.
        </p>

        {error ? (
          <div className="my-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="mt-1 text-xs opacity-90">
                  You can still choose an existing photo from your gallery or files below.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={btn.primary}
              >
                <Upload className="h-4 w-4" /> Pick Photo from Device
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={handleFallbackFile}
              />
            </div>
          </div>
        ) : (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {!active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-center p-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm font-semibold">Starting camera stream...</p>
                <p className="text-xs text-muted-foreground">
                  Please grant camera permission if prompted
                </p>
              </div>
            )}

            {/* Target frame overlay */}
            {active && (
              <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-bold text-primary underline underline-offset-4"
          >
            Or choose existing photo file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFallbackFile}
          />

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btn.soft}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!active || capturing}
              onClick={handleSnap}
              className={btn.primary}
            >
              <Camera className="h-4 w-4" /> {capturing ? "Snapping..." : "Capture Photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
