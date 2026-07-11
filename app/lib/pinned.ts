import { useSyncExternalStore } from "react";

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

const DEFAULT_PINNED_ROLES: string[] = [];

function readStorage(storageKey: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
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

function writeStorage(storageKey: string, value: string[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore (private mode / quota / SSR)
  }
}

function clearStorage(storageKey: string): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

type Listener = () => void;

export type PinnedStoreHook = () => {
  pinned: string[];
  toggle: (key: string) => void;
  reset: () => void;
  isDefault: boolean;
};

/**
 * Create a small external store (module-level subscribe/notify) backed by
 * localStorage, synchronized across all components in the current tab.
 * `null` snapshot means "not customized, use default".
 */
function createPinnedStore(
  storageKey: string,
  defaults: string[],
): PinnedStoreHook {
  const listeners = new Set<Listener>();
  let snapshot: string[] | null = readStorage(storageKey);

  function notify(): void {
    for (const l of listeners) l();
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot(): string[] {
    return snapshot ?? defaults;
  }

  function setPinned(next: string[]): void {
    snapshot = next;
    writeStorage(storageKey, next);
    notify();
  }

  function resetPinned(): void {
    snapshot = null;
    clearStorage(storageKey);
    notify();
  }

  return function usePinnedStore() {
    const pinned = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const toggle = (key: string) => {
      const current = getSnapshot();
      const next = current.includes(key)
        ? current.filter((p) => p !== key)
        : [...current, key];
      setPinned(next);
    };

    const reset = () => resetPinned();

    return { pinned, toggle, reset, isDefault: snapshot === null };
  };
}

/**
 * Pinned services shown at the top of the sidebar's service list.
 * Backed by localStorage and synchronized across all components in the
 * current tab via a small external store (module-level subscribe/notify).
 */
export const usePinnedServices = createPinnedStore(
  "roleup:pinnedServices",
  DEFAULT_PINNED_SERVICES,
);

/**
 * Pinned roles (short names, e.g. "bigquery.user") shown surfaced within
 * their service group in the sidebar's role list.
 */
export const usePinnedRoles = createPinnedStore(
  "roleup:pinnedRoles",
  DEFAULT_PINNED_ROLES,
);
