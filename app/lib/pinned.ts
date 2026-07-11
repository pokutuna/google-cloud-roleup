import { useSyncExternalStore } from "react";

const STORAGE_KEY = "roleup:pinnedServices";

export const DEFAULT_PINNED_SERVICES: string[] = [
  "iam",
  "bigquery",
  "storage",
  "compute",
  "run",
  "pubsub",
  "cloudsql",
  "logging",
  "monitoring",
  "secretmanager",
];

function readStorage(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStorage(value: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore (private mode / quota / SSR)
  }
}

function clearStorage(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

// cached snapshot: null means "not customized, use default"
let snapshot: string[] | null = readStorage();

function notify(): void {
  for (const l of listeners) l();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string[] {
  return snapshot ?? DEFAULT_PINNED_SERVICES;
}

function setPinned(next: string[]): void {
  snapshot = next;
  writeStorage(next);
  notify();
}

function resetPinned(): void {
  snapshot = null;
  clearStorage();
  notify();
}

/**
 * Pinned services shown at the top of the sidebar's service list.
 * Backed by localStorage and synchronized across all components in the
 * current tab via a small external store (module-level subscribe/notify).
 */
export function usePinnedServices(): {
  pinned: string[];
  toggle: (prefix: string) => void;
  reset: () => void;
  isDefault: boolean;
} {
  const pinned = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toggle = (prefix: string) => {
    const current = getSnapshot();
    const next = current.includes(prefix)
      ? current.filter((p) => p !== prefix)
      : [...current, prefix];
    setPinned(next);
  };

  const reset = () => resetPinned();

  return { pinned, toggle, reset, isDefault: snapshot === null };
}
