import type { MaterialMetadata } from "./types";

/**
 * Extracts readable text from PDF ArrayBuffers directly in the browser.
 * Handles text streams, Tj / TJ operators, and page delimiters without paid external APIs.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ text: string; metadata: MaterialMetadata }> {
  onProgress?.(15);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  onProgress?.(30);

  // Approximate page count by counting "/Type /Page" or "/Type/Page" occurrences
  const latin1Str = new TextDecoder("latin1").decode(bytes);
  const pageMatches = latin1Str.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;

  onProgress?.(50);
  const extractedChunks: string[] = [];

  // 1. Look for uncompressed stream text or uncompressed BT ... ET blocks
  const btEtRegex = /BT[\s\S]*?ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(latin1Str)) !== null) {
    const textBlock = extractStringsFromPdfBlock(match[0]);
    if (textBlock.trim()) {
      extractedChunks.push(textBlock.trim());
    }
  }

  onProgress?.(70);

  // 2. If BT...ET yielded little text, try decompressing FlateDecode streams
  if (extractedChunks.join(" ").length < 150) {
    const decompressedText = await extractFromFlateStreams(bytes);
    if (decompressedText.length > extractedChunks.join(" ").length) {
      extractedChunks.length = 0;
      extractedChunks.push(decompressedText);
    }
  }

  onProgress?.(90);

  const cleanText = cleanExtractedPdfText(extractedChunks.join("\n\n"));
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

  onProgress?.(100);

  if (!cleanText.trim()) {
    return {
      text: "",
      metadata: {
        pageCount,
        wordCount: 0,
      },
    };
  }

  return {
    text: cleanText,
    metadata: {
      pageCount,
      wordCount,
    },
  };
}

/**
 * Parses Tj, TJ, and text strings from a PDF BT...ET block
 */
function extractStringsFromPdfBlock(block: string): string {
  const result: string[] = [];

  // Match (string) Tj or 'string' or [(array)] TJ
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let tjMatch: RegExpExecArray | null;
  while ((tjMatch = tjRegex.exec(block)) !== null) {
    if (tjMatch[1]) {
      result.push(decodePdfString(tjMatch[1]));
    }
  }

  const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
  let arrayMatch: RegExpExecArray | null;
  while ((arrayMatch = tjArrayRegex.exec(block)) !== null) {
    const inner = arrayMatch[1];
    if (!inner) continue;
    const innerStrRegex = /\(([^)]*)\)/g;
    let sMatch: RegExpExecArray | null;
    const parts: string[] = [];
    while ((sMatch = innerStrRegex.exec(inner)) !== null) {
      if (sMatch[1]) {
        parts.push(decodePdfString(sMatch[1]));
      }
    }
    if (parts.length) {
      result.push(parts.join(""));
    }
  }

  return result.join(" ");
}

/**
 * Simple decoder for escaped PDF string literals
 */
function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/**
 * Searches for stream...endstream sections and decompresses deflate streams
 */
async function extractFromFlateStreams(bytes: Uint8Array): Promise<string> {
  const decoder = new TextDecoder("latin1");
  const fullStr = decoder.decode(bytes);
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;
  const textPieces: string[] = [];

  // Limit processing to first 25 streams to keep UI snappy
  let processed = 0;
  while ((streamMatch = streamRegex.exec(fullStr)) !== null && processed < 25) {
    processed++;
    const streamStart =
      streamMatch.index +
      streamMatch[0].indexOf("stream") +
      (streamMatch[0].includes("\r\n") ? 8 : 7);
    const streamEnd = streamMatch.index + streamMatch[0].lastIndexOf("endstream");
    if (streamEnd <= streamStart) continue;

    const streamData = bytes.slice(streamStart, streamEnd);

    try {
      // Try decompressing with standard browser DecompressionStream
      if (typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate");
        const writer = ds.writable.getWriter();
        writer.write(streamData);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const res = await reader.read();
          if (res.done) {
            done = true;
          } else if (res.value) {
            chunks.push(res.value);
          }
        }
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const combined = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
          combined.set(c, offset);
          offset += c.length;
        }

        const decompressed = new TextDecoder("utf-8", { fatal: false }).decode(combined);
        const extracted = extractStringsFromPdfBlock(decompressed);
        if (extracted.trim()) {
          textPieces.push(extracted.trim());
        }
      }
    } catch {
      // Stream may be an image or encoded with custom predictor; skip gracefully
    }
  }

  return textPieces.join("\n\n");
}

function cleanExtractedPdfText(text: string): string {
  let cleaned = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code !== 127) || code === 10 || code === 9 || code === 13) {
      cleaned += text[i];
    }
  }
  return cleaned
    .replace(/ +/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}
