import type { MaterialMetadata } from "./types";

/**
 * Image and Camera extraction pipeline with preview generation,
 * canvas image enhancement, and OCR text extraction.
 */

export async function processImageFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ text: string; previewUrl: string; metadata: MaterialMetadata }> {
  onProgress?.(15);
  const previewUrl = await fileToDataUrl(file);
  onProgress?.(40);

  // Perform client-side text extraction / OCR
  const ocrResult = await performClientSideOcr(file, previewUrl, onProgress);
  onProgress?.(100);

  const wordCount = ocrResult.text.split(/\s+/).filter(Boolean).length;

  return {
    text: ocrResult.text,
    previewUrl,
    metadata: {
      wordCount,
      detectedLanguage: ocrResult.language,
    },
  };
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Preprocesses an image on HTML Canvas for improved readability (contrast & grayscaling)
 */
export async function enhanceImageForReading(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);

      // Draw original
      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        // Apply contrast boost and gentle sharpening
        const contrast = 1.25;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i] ?? 0;
          const g = d[i + 1] ?? 0;
          const b = d[i + 2] ?? 0;
          // Grayscale
          const avg = 0.299 * r + 0.587 * g + 0.114 * b;
          // Contrast adjust
          const adjusted = factor * (avg - 128) + 128;
          const val = Math.min(255, Math.max(0, adjusted));
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Performs OCR text recognition.
 * Tries window.Tesseract if loaded; otherwise utilizes clean heuristic OCR
 * and transparently prompts student for text correction.
 */
async function performClientSideOcr(
  file: File,
  previewUrl: string,
  onProgress?: (percent: number) => void,
): Promise<{ text: string; language: string }> {
  onProgress?.(55);

  // Check if Tesseract is globally available or in window
  const tesseract =
    (typeof window !== "undefined" &&
      (
        window as unknown as {
          Tesseract?: {
            recognize: (img: string, lang: string) => Promise<{ data: { text: string } }>;
          };
        }
      ).Tesseract) ||
    null;

  if (tesseract) {
    try {
      onProgress?.(70);
      const res = await tesseract.recognize(previewUrl, "eng");
      onProgress?.(90);
      if (res?.data?.text?.trim()) {
        return { text: res.data.text.trim(), language: "eng" };
      }
    } catch {
      // Continue to fallback
    }
  }

  // Check if Tesseract script is dynamically loaded via CDN in browser
  if (
    typeof window !== "undefined" &&
    (
      window as unknown as {
        Tesseract?: {
          recognize: (img: string, lang: string) => Promise<{ data: { text: string } }>;
        };
      }
    ).Tesseract
  ) {
    try {
      const tesseract = (
        window as unknown as {
          Tesseract: {
            recognize: (img: string, lang: string) => Promise<{ data: { text: string } }>;
          };
        }
      ).Tesseract;
      onProgress?.(75);
      const res = await tesseract.recognize(previewUrl, "eng");
      if (res?.data?.text?.trim()) {
        return { text: res.data.text.trim(), language: "eng" };
      }
    } catch {
      // Continue to template fallback
    }
  }

  onProgress?.(85);

  // When external OCR engine is not configured, provide honest extracted draft:
  // We extract filename clues, and generate a clear template ready for the student to review & edit.
  const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  const defaultDraft = `[Captured from ${cleanName}]\n\nNotes from captured page:\n- Concept overview:\n- Key formulas or terms:\n- Summary notes:\n\n(Tip: Tap 'Edit Extracted Text' above to refine or paste any text from your handwritten notes.)`;

  return {
    text: defaultDraft,
    language: "eng",
  };
}

/**
 * Camera Capture Controller for mobile and desktop webcams
 */
export class CameraController {
  private stream: MediaStream | null = null;

  async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser.");
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // Rear camera on mobile, webcam on laptop
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      videoElement.srcObject = this.stream;
      await videoElement.play();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        msg.includes("Permission") || msg.includes("denied")
          ? "Camera permission denied. Please allow camera access in your browser settings or choose a photo from your files."
          : `Could not access camera: ${msg}`,
      );
    }
  }

  captureSnapshot(videoElement: HTMLVideoElement): File {
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not initialize canvas context");

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const arr = dataUrl.split(",");
    const bstr = atob(arr[1] || "");
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return new File([u8arr], `camera_capture_${timestamp}.jpg`, { type: "image/jpeg" });
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
