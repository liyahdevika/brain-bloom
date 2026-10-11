import type { MaterialMetadata, SlideData } from "./types";

/**
 * Extracts ordered slide text from PPT and PPTX presentations in-browser.
 * Parses OpenXML slide files (ppt/slides/slide*.xml) and preserves exact slide order.
 */
export async function extractTextFromPptx(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ text: string; metadata: MaterialMetadata }> {
  onProgress?.(10);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  onProgress?.(25);

  const isModernPptx = file.name.toLowerCase().endsWith(".pptx") || isZipFile(bytes);

  if (isModernPptx) {
    return extractFromPptxZip(bytes, onProgress);
  } else {
    return extractFromLegacyPpt(bytes, onProgress);
  }
}

function isZipFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

/**
 * Reads PPTX ZIP archive, finds all ppt/slides/slide{N}.xml files in order,
 * and extracts all text tags <a:t>.
 */
async function extractFromPptxZip(
  bytes: Uint8Array,
  onProgress?: (percent: number) => void,
): Promise<{ text: string; metadata: MaterialMetadata }> {
  onProgress?.(35);
  const entries = await readZipEntries(bytes);
  onProgress?.(55);

  // Filter for slides: "ppt/slides/slide{N}.xml"
  const slideEntries: { slideNumber: number; name: string; getData: () => Promise<Uint8Array> }[] =
    [];

  for (const entry of entries) {
    const match = entry.filename.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match && match[1]) {
      slideEntries.push({
        slideNumber: parseInt(match[1], 10),
        name: entry.filename,
        getData: entry.getData,
      });
    }
  }

  // Preserve slide order naturally (Slide 1, Slide 2, Slide 3...)
  slideEntries.sort((a, b) => a.slideNumber - b.slideNumber);

  const slides: SlideData[] = [];
  const textDecoder = new TextDecoder("utf-8");

  for (let i = 0; i < slideEntries.length; i++) {
    const item = slideEntries[i];
    if (!item) continue;
    const slideBytes = await item.getData();
    const xml = textDecoder.decode(slideBytes);
    const slideText = parseSlideXml(xml);

    // Try finding slide title (first line or first heading tag)
    const lines = slideText.split("\n").filter((l) => l.trim().length > 0);
    const title = lines[0] || `Slide ${item.slideNumber}`;

    slides.push({
      slideNumber: item.slideNumber,
      title,
      text: slideText,
    });

    const stepProgress = 55 + Math.round(((i + 1) / Math.max(1, slideEntries.length)) * 35);
    onProgress?.(stepProgress);
  }

  onProgress?.(95);

  const formattedSlides = slides
    .map((s) => `### Slide ${s.slideNumber}: ${s.title}\n${s.text}`)
    .join("\n\n---\n\n");

  const fullText = formattedSlides.trim();
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  onProgress?.(100);

  return {
    text: fullText,
    metadata: {
      slideCount: slides.length,
      slides,
      wordCount,
    },
  };
}

/**
 * Parses <a:t> tags and <a:p> paragraphs from slide XML
 */
function parseSlideXml(xml: string): string {
  try {
    // If running in browser with DOMParser
    if (typeof DOMParser !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      const paragraphs = Array.from(doc.getElementsByTagName("a:p"));

      if (paragraphs.length > 0) {
        return paragraphs
          .map((p) => {
            const texts = Array.from(p.getElementsByTagName("a:t")).map((t) => t.textContent || "");
            return texts.join("");
          })
          .filter((t) => t.trim().length > 0)
          .join("\n");
      }
    }
  } catch {
    // Fallback to regex parser
  }

  // Fast regex extraction of <a:t> text nodes
  const paragraphs = xml.split(/<\/a:p>/i);
  const result: string[] = [];

  for (const para of paragraphs) {
    const textMatches = para.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi);
    if (textMatches) {
      const line = textMatches
        .map((m) =>
          m
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">"),
        )
        .join("");
      if (line.trim()) {
        result.push(line.trim());
      }
    }
  }

  return result.join("\n");
}

/**
 * Handles legacy binary PPT format by searching for readable UTF-16 / ASCII slide text
 */
function extractFromLegacyPpt(
  bytes: Uint8Array,
  onProgress?: (percent: number) => void,
): { text: string; metadata: MaterialMetadata } {
  onProgress?.(50);
  const latin1 = new TextDecoder("latin1").decode(bytes);
  // Extract printable text chunks longer than 4 chars
  const chunks = latin1.match(/[\x20-\x7E]{4,}/g) || [];
  const meaningful = chunks.filter((c) => !/^[A-Za-z0-9+/=]{20,}$/.test(c) && !/^_/.test(c));

  onProgress?.(90);
  const fullText = meaningful.slice(0, 80).join("\n");
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  onProgress?.(100);

  return {
    text: fullText,
    metadata: {
      slideCount: 1,
      wordCount,
    },
  };
}

/**
 * Lightweight ZIP Central Directory reader with DecompressionStream support
 */
type ZipEntry = {
  filename: string;
  getData: () => Promise<Uint8Array>;
};

async function readZipEntries(bytes: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // 1. Locate End of Central Directory record (EOCD): 0x06054b50
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    // If EOCD not found, try reading local headers sequentially
    return readZipLocalHeaders(bytes);
  }

  const cdCount = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const entries: ZipEntry[] = [];
  let curr = cdOffset;
  const textDecoder = new TextDecoder("utf-8");

  for (let i = 0; i < cdCount && curr < bytes.length; i++) {
    if (view.getUint32(curr, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(curr + 10, true);
    const compressedSize = view.getUint32(curr + 20, true);
    const uncompressedSize = view.getUint32(curr + 24, true);
    const fnLen = view.getUint16(curr + 28, true);
    const extraLen = view.getUint16(curr + 30, true);
    const commentLen = view.getUint16(curr + 32, true);
    const localHeaderOffset = view.getUint32(curr + 42, true);

    const fnBytes = bytes.slice(curr + 46, curr + 46 + fnLen);
    const filename = textDecoder.decode(fnBytes);

    curr += 46 + fnLen + extraLen + commentLen;

    const getData = async (): Promise<Uint8Array> => {
      // Read local header to get precise start of file data
      const lhView = new DataView(bytes.buffer, bytes.byteOffset + localHeaderOffset, 30);
      const lhFnLen = lhView.getUint16(26, true);
      const lhExtraLen = lhView.getUint16(28, true);
      const dataStart = localHeaderOffset + 30 + lhFnLen + lhExtraLen;
      const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        // Uncompressed
        return compressedData;
      } else if (compressionMethod === 8) {
        // Raw deflate
        return decompressDeflateRaw(compressedData, uncompressedSize);
      } else {
        throw new Error(`Unsupported zip compression method: ${compressionMethod}`);
      }
    };

    entries.push({ filename, getData });
  }

  return entries;
}

/**
 * Fallback to reading local headers directly
 */
async function readZipLocalHeaders(bytes: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const textDecoder = new TextDecoder("utf-8");
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset + 30 < bytes.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;

    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const uncompSize = view.getUint32(offset + 22, true);
    const fnLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const fnBytes = bytes.slice(offset + 30, offset + 30 + fnLen);
    const filename = textDecoder.decode(fnBytes);
    const dataStart = offset + 30 + fnLen + extraLen;
    const currentDataStart = dataStart;
    const currentCompSize = compSize;
    const currentMethod = method;
    const currentUncompSize = uncompSize;

    entries.push({
      filename,
      getData: async () => {
        const compressed = bytes.slice(currentDataStart, currentDataStart + currentCompSize);
        if (currentMethod === 0) return compressed;
        if (currentMethod === 8) return decompressDeflateRaw(compressed, currentUncompSize);
        return compressed;
      },
    });

    offset = dataStart + compSize;
  }

  return entries;
}

/**
 * Decompresses raw deflate bytes using browser DecompressionStream("deflate-raw")
 */
async function decompressDeflateRaw(
  compressed: Uint8Array,
  _expectedSize?: number,
): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "undefined") {
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(compressed as unknown as BufferSource);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const res = await reader.read();
        if (res.done) done = true;
        else if (res.value) chunks.push(res.value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLen);
      let pos = 0;
      for (const c of chunks) {
        result.set(c, pos);
        pos += c.length;
      }
      return result;
    } catch {
      // Fallback
    }
  }

  // If DecompressionStream not supported or fails, return empty
  return new Uint8Array(0);
}
