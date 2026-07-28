/**
 * Exercise demo-video helpers, extracted from the deleted ExerciseLink
 * component so the DemoChip/DemoSheet flow (and the hasDemo gating) can share
 * them without mounting a player.
 */

export interface ExerciseLinkInfo {
  type: "youtube" | "image" | "unknown";
  videoId?: string;
  thumbnailUrl?: string;
  isValid: boolean;
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function processExerciseLink(
  url: string | null | undefined,
): ExerciseLinkInfo {
  if (!url) {
    return { type: "unknown", isValid: false };
  }

  try {
    const urlObj = new URL(url);

    const youtubePatterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=.+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/.+/,
    ];

    const isYoutube = youtubePatterns.some((pattern) => pattern.test(url));

    if (isYoutube) {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        return {
          type: "youtube",
          videoId,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          isValid: true,
        };
      }
    }

    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    const isImage =
      imageExtensions.some((ext) =>
        urlObj.pathname.toLowerCase().endsWith(ext),
      ) ||
      urlObj.searchParams.has("format") ||
      urlObj.hostname.includes("images") ||
      urlObj.hostname.includes("img") ||
      urlObj.hostname.includes("cdn");

    if (isImage) {
      return { type: "image", isValid: true };
    }

    return { type: "unknown", isValid: false };
  } catch {
    return { type: "unknown", isValid: false };
  }
}

/**
 * Whether an exercise gets a Demo chip. Synchronous on purpose — the chip
 * must never pop in/out as async checks resolve (SPEC §4). `hasDemo` is the
 * backend's generation-time oEmbed verdict; `null`/`undefined` means
 * not-yet-validated, which renders optimistically (the sheet's runtime
 * fallback catches the rare dead video).
 */
export function exerciseHasDemo(exercise: {
  link?: string | null;
  hasDemo?: boolean | null;
}): boolean {
  if (exercise.hasDemo === false) return false;
  const info = processExerciseLink(exercise.link);
  return info.isValid && info.type === "youtube" && !!info.videoId;
}

export interface OEmbedResult {
  /** "ok" = playable; "dead" = removed/private/blocked/non-embeddable;
   *  "unknown" = transient failure (429/5xx/offline) — treat as playable. */
  status: "ok" | "dead" | "unknown";
  /** YouTube channel name, when the video is alive. */
  channel?: string;
}

// oEmbed answers are identical for every user and effectively immutable per
// session; memoise so stepping prev/next re-uses the first fetch.
const oembedCache = new Map<string, OEmbedResult>();

/**
 * Validate a YouTube video via oEmbed. A removed/private/region-blocked or
 * non-embeddable video returns a client error (400 bad id, 401 embedding
 * disabled, 403 forbidden, 404 not found); 429/5xx and network errors are
 * transient — the caller should keep the player's onError as the safety net.
 */
export async function checkYouTubeVideo(videoId: string): Promise<OEmbedResult> {
  const cached = oembedCache.get(videoId);
  if (cached && cached.status !== "unknown") return cached;

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    );
    let result: OEmbedResult;
    if (res.ok) {
      const body = (await res.json()) as { author_name?: string };
      result = { status: "ok", channel: body.author_name };
    } else if ([400, 401, 403, 404].includes(res.status)) {
      result = { status: "dead" };
    } else {
      result = { status: "unknown" };
    }
    oembedCache.set(videoId, result);
    return result;
  } catch {
    const result: OEmbedResult = { status: "unknown" };
    oembedCache.set(videoId, result);
    return result;
  }
}
