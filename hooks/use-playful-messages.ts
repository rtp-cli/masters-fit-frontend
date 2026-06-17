import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// Whether the generation timeline weaves in the age-aware playful status lines
// (Task 3). Default ON. Stored locally and shared across consumers (the
// generation modal that reads it and the Settings toggle that writes it) via a
// tiny in-memory cache + subscriber set, mirroring the lib/tab-events pattern
// so we don't need to thread a provider through the tree.
const STORAGE_KEY = "@playful_messages_enabled";

let cached: boolean | null = null;
const listeners = new Set<(value: boolean) => void>();

export async function loadPlayfulMessages(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cached = stored === null ? true : stored === "true";
  } catch {
    cached = true;
  }
  return cached;
}

export function setPlayfulMessages(enabled: boolean): void {
  cached = enabled;
  AsyncStorage.setItem(STORAGE_KEY, enabled ? "true" : "false").catch(() => {});
  listeners.forEach((listener) => listener(enabled));
}

export function usePlayfulMessages() {
  const [playfulEnabled, setEnabled] = useState<boolean>(cached ?? true);

  useEffect(() => {
    let mounted = true;
    loadPlayfulMessages().then((value) => {
      if (mounted) setEnabled(value);
    });
    const listener = (value: boolean) => setEnabled(value);
    listeners.add(listener);
    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  return { playfulEnabled, setPlayfulEnabled: setPlayfulMessages };
}
