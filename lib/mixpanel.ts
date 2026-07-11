import * as Application from "expo-application";
import { Mixpanel } from "mixpanel-react-native";
import { Platform } from "react-native";

import { logger } from "./logger";

/**
 * Mixpanel client singleton.
 *
 * Previously the Mixpanel SDK was constructed inside MixpanelProvider's effect
 * and immediately discarded — it only ran autocapture and exposed no way to send
 * a custom event or identify the user. This module retains the instance so any
 * code (contexts, hooks, plain functions) can `track` / `identify` / `reset`.
 *
 * Identity: we identify with the user's UUID, which is the same value the backend
 * uses as the Mixpanel `distinct_id` (see backend mixpanel.service.ts). That keeps
 * client-emitted events (e.g. generation timing) joined to the same person as the
 * backend-emitted events, instead of forking into an anonymous device stream.
 *
 * All functions are safe no-ops when the SDK isn't initialized (dev, or missing
 * token) — they log at debug level so you can still see events firing locally.
 */

let instance: Mixpanel | null = null;

export function isMixpanelReady(): boolean {
  return instance !== null;
}

/** Construct + init the SDK. Call once (from MixpanelProvider). Returns success. */
export async function initMixpanel(token: string): Promise<boolean> {
  if (instance) return true;
  try {
    // Second arg is `trackAutomaticEvents` — keep autocapture on (matches prior behavior).
    const m = new Mixpanel(token, true);
    await m.init();
    instance = m;
    // [AN-05] Super properties ride on every event automatically, so we don't
    // thread app version / platform through each call site.
    try {
      m.registerSuperProperties({
        app_version: Application.nativeApplicationVersion || "unknown",
        platform: Platform.OS,
      });
    } catch {
      // Non-fatal — events still send without super properties.
    }
    return true;
  } catch (error) {
    logger.error("Failed to initialize Mixpanel", {
      error_message: (error as Error)?.message,
    });
    instance = null;
    return false;
  }
}

export function track(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!instance) {
    logger.debug?.("[mixpanel:noop] track", { event, properties });
    return;
  }
  try {
    instance.track(event, properties);
  } catch (error) {
    logger.error("Mixpanel track failed", {
      event,
      error_message: (error as Error)?.message,
    });
  }
}

/** Tie subsequent events to this user (uuid = backend distinct_id) and set people props. */
export function identify(
  distinctId: string,
  peopleProperties?: Record<string, unknown>,
): void {
  if (!instance || !distinctId) {
    logger.debug?.("[mixpanel:noop] identify", { distinctId });
    return;
  }
  try {
    instance.identify(String(distinctId));
    if (peopleProperties) {
      instance.getPeople().set(peopleProperties);
    }
  } catch (error) {
    logger.error("Mixpanel identify failed", {
      error_message: (error as Error)?.message,
    });
  }
}

/** Clear identity on logout so a shared device doesn't attribute the next user's events. */
export function reset(): void {
  if (!instance) return;
  try {
    instance.reset();
  } catch (error) {
    logger.error("Mixpanel reset failed", {
      error_message: (error as Error)?.message,
    });
  }
}
