import { apiRequest } from "./api";

// Data layer for the share-a-workout feature. Mirrors lib/feedback.ts: thin
// wrappers over apiRequest that unwrap the { success, data } envelope and never
// touch tokens/headers directly.

export type ShareKind = "completed" | "planned" | "milestone";
export type ShareNameStyle = "first" | "full" | "anonymous";

export interface ShareRequestParams {
  planDayId?: number;
  kind: ShareKind;
  showWeights: boolean;
  showStreak: boolean;
  nameStyle: ShareNameStyle;
}

export interface ShareLinkResult {
  code: string;
  url: string;
  cardUrl: string;
}

export interface SharedLinkSummary {
  code: string;
  kind: ShareKind;
  workoutName: string;
  url: string;
  openCount: number;
  revoked: boolean;
  createdAt: string;
}

/**
 * Ask for a non-persisted preview render (§3.3). Nothing is minted; the returned
 * URL points at the card renderer via a signed, short-lived token. Called on
 * sheet open and on every toggle change.
 */
export async function fetchSharePreview(
  params: ShareRequestParams
): Promise<string | null> {
  try {
    const response = await apiRequest<{ success: boolean; data: { previewUrl: string } }>(
      `/share/preview`,
      { method: "POST", body: JSON.stringify(params) }
    );
    return response.data?.previewUrl ?? null;
  } catch (error) {
    console.error("Error fetching share preview:", error);
    return null;
  }
}

/**
 * Mint (or reuse) a published public link. Called ONLY on an explicit
 * Share / Copy link / Save image tap — never on sheet open (§3.3). Idempotent
 * server-side per (planDayId, kind, showWeights, showStreak, nameStyle).
 */
export async function createShareLink(
  params: ShareRequestParams
): Promise<ShareLinkResult | null> {
  try {
    const response = await apiRequest<{ success: boolean; data: ShareLinkResult }>(
      `/share/workout`,
      { method: "POST", body: JSON.stringify(params) }
    );
    return response.data ?? null;
  } catch (error) {
    console.error("Error creating share link:", error);
    return null;
  }
}

/** List the caller's share links, newest first (Settings revoke list). */
export async function listShareLinks(): Promise<SharedLinkSummary[]> {
  try {
    const response = await apiRequest<{ success: boolean; data: SharedLinkSummary[] }>(
      `/share`,
      { method: "GET" }
    );
    return response.data ?? [];
  } catch (error) {
    console.error("Error listing share links:", error);
    return [];
  }
}

/** Revoke a link the caller owns. Returns true on success. */
export async function revokeShareLink(code: string): Promise<boolean> {
  try {
    await apiRequest<{ success: boolean }>(`/share/${code}`, { method: "DELETE" });
    return true;
  } catch (error) {
    console.error("Error revoking share link:", error);
    return false;
  }
}
