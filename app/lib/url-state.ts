import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

/** r: short role name ("bigquery.user"), p: permission name */
export interface SelItem {
  type: "r" | "p";
  name: string;
}

function parseSel(raw: string | null): SelItem[] {
  if (!raw) return [];
  const items: SelItem[] = [];
  for (const entry of raw.split(",")) {
    const m = entry.match(/^([rp]):(.+)$/);
    if (m) items.push({ type: m[1] as "r" | "p", name: m[2] });
  }
  return items;
}

function encodeSel(items: SelItem[]): string {
  return items.map((it) => `${it.type}:${it.name}`).join(",");
}

export function sameItem(a: SelItem, b: SelItem): boolean {
  return a.type === b.type && a.name === b.name;
}

/**
 * The whole explorer state lives in the URL: ?q= (omnibox query) and
 * ?sel= (selected roles / permission anchor). Typing replaces history,
 * selection changes push so the back button walks selection states.
 */
export function useExplorerState() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const selection = useMemo(() => parseSel(params.get("sel")), [params]);
  const showServiceAgents = params.get("sa") === "1";

  const update = useCallback(
    (next: { q?: string; sel?: SelItem[]; sa?: boolean }, replace: boolean) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next.q !== undefined) {
            if (next.q) p.set("q", next.q);
            else p.delete("q");
          }
          if (next.sel !== undefined) {
            if (next.sel.length > 0) p.set("sel", encodeSel(next.sel));
            else p.delete("sel");
          }
          if (next.sa !== undefined) {
            if (next.sa) p.set("sa", "1");
            else p.delete("sa");
          }
          return p;
        },
        { replace, preventScrollReset: true },
      );
    },
    [setParams],
  );

  const setQ = useCallback(
    (value: string) => update({ q: value }, true),
    [update],
  );

  /** row click: make this the single anchor */
  const select = useCallback(
    (item: SelItem) => update({ sel: [item] }, false),
    [update],
  );

  /** checkbox: add to / remove from the comparison set (roles only) */
  const toggle = useCallback(
    (item: SelItem) => {
      const rest = selection.filter((it) => !sameItem(it, item));
      const next =
        rest.length < selection.length
          ? rest
          : [...selection.filter((it) => it.type === "r"), item];
      update({ sel: next }, false);
    },
    [selection, update],
  );

  const remove = useCallback(
    (item: SelItem) =>
      update({ sel: selection.filter((it) => !sameItem(it, item)) }, false),
    [selection, update],
  );

  const clear = useCallback(() => update({ sel: [] }, false), [update]);

  const setShowServiceAgents = useCallback(
    (v: boolean) => update({ sa: v }, true),
    [update],
  );

  return {
    q,
    setQ,
    selection,
    select,
    toggle,
    remove,
    clear,
    showServiceAgents,
    setShowServiceAgents,
  };
}

export type ExplorerState = ReturnType<typeof useExplorerState>;
