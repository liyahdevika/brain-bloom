export * from "./types";
export * from "./pdf-extractor";
export * from "./pptx-extractor";
export * from "./image-extractor";
export * from "./youtube-extractor";
export * from "./text-extractor";

import type { ImportedMaterial, MaterialType } from "./types";
import { extractTextFromPdf } from "./pdf-extractor";
import { extractTextFromPptx } from "./pptx-extractor";
import { processImageFile } from "./image-extractor";
import { fetchYouTubeMetadata, buildYouTubeMaterialText } from "./youtube-extractor";
import { processRawTextInput } from "./text-extractor";

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Universal file importer that routes to specific extractors based on detected or declared format
 */
export async function importFromFile(
  file: File,
  typeHint?: MaterialType,
  onProgress?: (percent: number) => void,
): Promise<ImportedMaterial> {
  const name = file.name.toLowerCase();
  const inferredType: MaterialType =
    typeHint ||
    (name.endsWith(".pdf")
      ? "pdf"
      : name.endsWith(".ppt") || name.endsWith(".pptx")
        ? "ppt"
        : /\.(jpe?g|png|webp)$/i.test(name)
          ? "image"
          : "text");

  const id = uid();
  const now = new Date().toISOString();

  let extractedText = "";
  let previewUrl: string | undefined;
  let metadata: ImportedMaterial["metadata"];

  if (inferredType === "pdf") {
    const res = await extractTextFromPdf(file, onProgress);
    extractedText = res.text;
    metadata = res.metadata;
  } else if (inferredType === "ppt") {
    const res = await extractTextFromPptx(file, onProgress);
    extractedText = res.text;
    metadata = res.metadata;
  } else if (inferredType === "image" || inferredType === "camera") {
    const res = await processImageFile(file, onProgress);
    extractedText = res.text;
    previewUrl = res.previewUrl;
    metadata = res.metadata;
  } else {
    const textContent = await file.text();
    const res = processRawTextInput(textContent, file.name);
    extractedText = res.text;
    metadata = res.metadata;
  }

  return {
    id,
    title: file.name.replace(/\.[^/.]+$/, ""),
    type: inferredType,
    sizeBytes: file.size,
    status: "ready",
    progress: 100,
    previewUrl,
    extractedText,
    originalText: extractedText,
    metadata,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * YouTube importer
 */
export async function importFromYouTubeUrl(
  url: string,
  manualTranscript?: string,
): Promise<ImportedMaterial> {
  const details = await fetchYouTubeMetadata(url);
  const textInfo = buildYouTubeMaterialText(details, manualTranscript);
  const now = new Date().toISOString();

  return {
    id: uid(),
    title: details.title,
    type: "youtube",
    sizeBytes: 0,
    status: "ready",
    progress: 100,
    previewUrl: details.thumbnailUrl,
    extractedText: textInfo.text,
    originalText: textInfo.text,
    metadata: {
      ...details.metadata,
      wordCount: textInfo.wordCount,
      hasTranscript: textInfo.hasTranscript,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Text importer
 */
export function importFromRawText(text: string, title?: string): ImportedMaterial {
  const res = processRawTextInput(text, title);
  const now = new Date().toISOString();

  return {
    id: uid(),
    title: res.title,
    type: "text",
    sizeBytes: new Blob([res.text]).size,
    status: "ready",
    progress: 100,
    extractedText: res.text,
    originalText: res.text,
    metadata: res.metadata,
    createdAt: now,
    updatedAt: now,
  };
}
