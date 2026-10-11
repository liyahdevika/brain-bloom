import type { MaterialMetadata } from "./types";

/**
 * YouTube URL validator and metadata resolver.
 * Retrieves genuine video title, author, and high-resolution thumbnail via oEmbed.
 * Respects strict data honesty: clearly explains transcript access limits and
 * provides manual transcript/notes input.
 */

export type YouTubeDetails = {
  videoId: string;
  videoUrl: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
  metadata: MaterialMetadata;
};

export function extractYouTubeVideoId(inputUrl: string): string | null {
  const trimmed = inputUrl.trim();
  if (!trimmed) return null;

  // Handles:
  // - https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // - https://youtu.be/dQw4w9WgXcQ
  // - https://www.youtube.com/embed/dQw4w9WgXcQ
  // - https://www.youtube.com/shorts/dQw4w9WgXcQ
  // - dQw4w9WgXcQ (direct ID)
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = trimmed.match(regExp);

  if (match && match[1]) {
    return match[1];
  }

  // If user pasted pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export async function fetchYouTubeMetadata(urlOrId: string): Promise<YouTubeDetails> {
  const videoId = extractYouTubeVideoId(urlOrId);

  if (!videoId) {
    throw new Error(
      "Invalid YouTube URL. Please provide a valid link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...).",
    );
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  let title = `YouTube Video (${videoId})`;
  let authorName = "YouTube Creator";

  // Attempt to fetch oEmbed metadata (supported by YouTube publicly without API keys)
  try {
    const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(standardUrl)}`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
      if (data.author_name) authorName = data.author_name;
    }
  } catch {
    // Graceful fallback to default title if offline or network blocked
  }

  return {
    videoId,
    videoUrl: standardUrl,
    title,
    authorName,
    thumbnailUrl,
    metadata: {
      videoId,
      authorName,
      hasTranscript: false,
    },
  };
}

/**
 * Honest YouTube material extractor:
 * If user provided manual transcript or notes, process it.
 * Otherwise, prepare the video material container with helpful instructions.
 */
export function buildYouTubeMaterialText(
  details: YouTubeDetails,
  manualTranscript?: string,
): { text: string; wordCount: number; hasTranscript: boolean } {
  const cleanTranscript = (manualTranscript || "").trim();

  if (cleanTranscript) {
    const fullText = `Video: ${details.title}\nChannel: ${details.authorName}\nURL: ${details.videoUrl}\n\nTranscript & Notes:\n${cleanTranscript}`;
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    return {
      text: fullText,
      wordCount,
      hasTranscript: true,
    };
  }

  const placeholderText = `Video: ${details.title}\nChannel: ${details.authorName}\nURL: ${details.videoUrl}\n\n[Transcript Not Loaded: YouTube does not permit direct in-browser caption scraping without a backend proxy or official API key. Click 'Paste Transcript / Notes' to add the lecture text and generate study tools.]`;

  return {
    text: placeholderText,
    wordCount: placeholderText.split(/\s+/).filter(Boolean).length,
    hasTranscript: false,
  };
}
