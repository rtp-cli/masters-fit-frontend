/**
 * Utility functions for handling exercise links (YouTube videos and images)
 */

/**
 * Check if a URL is a YouTube URL
 * @param url URL to check
 * @returns boolean indicating if it's a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  const youtubePatterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=.+/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/.+/,
  ];

  return youtubePatterns.some((pattern) => pattern.test(url));
}

/**
 * Check if a URL is an image URL
 * @param url URL to check
 * @returns boolean indicating if it's an image URL
 */
export function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

    return (
      imageExtensions.some((ext) =>
        urlObj.pathname.toLowerCase().endsWith(ext)
      ) ||
      urlObj.searchParams.has("format") ||
      urlObj.hostname.includes("images") ||
      urlObj.hostname.includes("img") ||
      urlObj.hostname.includes("cdn")
    );
  } catch {
    return false;
  }
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 * @param url YouTube URL
 * @returns Video ID or null if not found
 */
export function getYouTubeVideoId(url: string): string | null {
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

/**
 * Get YouTube thumbnail URL for a video ID
 * @param videoId YouTube video ID
 * @returns Thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Get YouTube embed URL for a video ID
 * @param videoId YouTube video ID
 * @returns Embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1`;
}
