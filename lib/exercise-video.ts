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

// Keep in lockstep with the backend copy in
// src/utils/video-validation.ts — client and server must agree on which links
// count as a playable demo (hasDemo).
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    // Standard watch URL: watch?v=ID (also matches ...&v=ID).
    /[?&]v=([^&\n?#]+)/,
    // Short share links: youtu.be/ID (?si=… trackers stripped by the class).
    /youtu\.be\/([^&\n?#/]+)/,
    // Path-style IDs — the canonical embed plus the non-standard shapes the
    // seed data actually contains (watch/ID, shorts/ID, video/ID, v/ID). These
    // carry a valid 11-char ID; only the URL wrapper is off, so recover it
    // rather than dropping the demo.
    /youtube\.com\/(?:embed|shorts|video|watch|v)\/([^&\n?#/]+)/,
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

    // [#103] Extension-only, and deliberately narrower than this used to be.
    // The old predicate also accepted any host containing "cdn", "img" or
    // "images", or any URL carrying a `format` param. That was harmless while
    // `type: "image"` was produced and then consumed by nothing; now that an
    // image actually renders in the demo sheet, the loose version would put a
    // broken picture in front of the user. A missing chip beats a broken one.
    // Mirrored server-side in backend src/utils/video-validation.ts
    // (`isImageLink`) — keep the two in lockstep.
    if (/\.(jpe?g|png|gif|webp|svg)$/i.test(urlObj.pathname)) {
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
 * backend's generation-time verdict; `null`/`undefined` means
 * not-yet-validated, which renders optimistically (the sheet's runtime
 * fallback catches the rare dead video).
 *
 * [#103] A still image counts. Some movements have no required form to
 * demonstrate — the generation prompt has always told the model to attach a
 * public image rather than a video for "something like walking or cycling" —
 * and until now this gate accepted YouTube only, so those links produced no
 * affordance at all. Note the backend must agree: `checkDemoLink` stamps
 * has_demo, and a `false` there short-circuits this function regardless of the
 * link.
 */
export function exerciseHasDemo(exercise: {
  link?: string | null;
  hasDemo?: boolean | null;
}): boolean {
  if (exercise.hasDemo === false) return false;
  const info = processExerciseLink(exercise.link);
  if (info.type === "image") return info.isValid;
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
