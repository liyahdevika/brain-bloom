import type { MaterialMetadata } from "./types";

/**
 * Text notes extractor and validator
 */
export function processRawTextInput(
  rawText: string,
  userTitle?: string,
): { title: string; text: string; metadata: MaterialMetadata } {
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error(
      "Text input cannot be empty. Please paste your lecture notes or study content.",
    );
  }

  // Derive a smart title if user didn't provide one
  let title = userTitle?.trim();
  if (!title) {
    const firstLine = (trimmed.split("\n")[0] || "")
      .trim()
      .replace(/^[#*\-•\s]+/, "");
    title =
      firstLine.length > 50 ? `${firstLine.slice(0, 47)}...` : firstLine || "Untitled Study Notes";
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  return {
    title,
    text: trimmed,
    metadata: {
      wordCount,
    },
  };
}
