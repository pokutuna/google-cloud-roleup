import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { MAX_COMPARE_ROLES } from "../components/colors";

/** r: short role name ("bigquery.user"), p: permission name */
export interface SelItem {
  type: "r" | "p";
  name: string;
}

export function parseSel(raw: string | null): SelItem[] {
  if (!raw) return [];
  const items: SelItem[] = [];
  for (const entry of raw.split(",")) {
    const m = entry.match(/^([rp]):(.+)$/);
    if (m) items.push({ type: m[1] as "r" | "p", name: m[2] });
  }
  return items;
}

export function encodeSel(items: SelItem[]): string {
  return items.map((it) => `${it.type}:${it.name}`).join(",");
}

export function sameItem(a: SelItem, b: SelItem): boolean {
  return a.type === b.type && a.name === b.name;
}

/** ReversePane role ordering; default is "count-asc" (least privilege first) */
export type SortKey = "count-asc" | "count-desc" | "name";
const SORT_KEYS: SortKey[] = ["count-asc", "count-desc", "name"];
const DEFAULT_SORT: SortKey = "count-asc";

/** ComparePane matrix grouping: by diff (holder combination) or by name */
export type CompareSortMode = "diff" | "name";
const COMPARE_SORT_MODES: CompareSortMode[] = ["diff", "name"];

/**
 * The whole explorer state lives in the URL: ?q= (omnibox query) and
 * ?i= (selected roles / permission anchor). Typing replaces history,
 * selection changes push so the back button walks selection states.
 */
export function useExplorerState() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const selection = useMemo(() => parseSel(params.get("i")), [params]);
  const showServiceAgents = params.get("agents") === "1";
  const sortParam = params.get("sort");
  const sort: SortKey = SORT_KEYS.includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : DEFAULT_SORT;

  // undefined: not set — ComparePane's default depends on the role count
  const cmpSortParam = params.get("cmpSort");
  const cmpSort: CompareSortMode | undefined = COMPARE_SORT_MODES.includes(
    cmpSortParam as CompareSortMode,
  )
    ? (cmpSortParam as CompareSortMode)
    : undefined;
  const cmpReversed = params.get("cmpReversed") === "1";
  const cmpShowCommon = params.get("cmpCommon") !== "0";
  const cmpShowUnheld = params.get("cmpUnheld") === "1";

  const update = useCallback(
    (
      next: {
        q?: string;
        sel?: SelItem[];
        agents?: boolean;
        sort?: SortKey;
        cmpSort?: CompareSortMode;
        cmpReversed?: boolean;
        cmpShowCommon?: boolean;
        cmpShowUnheld?: boolean;
      },
      replace: boolean,
    ) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next.q !== undefined) {
            if (next.q) p.set("q", next.q);
            else p.delete("q");
          }
          if (next.sel !== undefined) {
            if (next.sel.length > 0) p.set("i", encodeSel(next.sel));
            else p.delete("i");
          }
          if (next.agents !== undefined) {
            if (next.agents) p.set("agents", "1");
            else p.delete("agents");
          }
          if (next.sort !== undefined) {
            if (next.sort !== DEFAULT_SORT) p.set("sort", next.sort);
            else p.delete("sort");
          }
          if (next.cmpSort !== undefined) p.set("cmpSort", next.cmpSort);
          if (next.cmpReversed !== undefined) {
            if (next.cmpReversed) p.set("cmpReversed", "1");
            else p.delete("cmpReversed");
          }
          if (next.cmpShowCommon !== undefined) {
            if (next.cmpShowCommon) p.delete("cmpCommon");
            else p.set("cmpCommon", "0");
          }
          if (next.cmpShowUnheld !== undefined) {
            if (next.cmpShowUnheld) p.set("cmpUnheld", "1");
            else p.delete("cmpUnheld");
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

  /** permission click: keep selected roles, replace the p: anchor */
  const anchorPerm = useCallback(
    (name: string) =>
      update(
        {
          sel: [
            ...selection.filter((it) => it.type === "r"),
            { type: "p", name },
          ],
        },
        false,
      ),
    [selection, update],
  );

  /** checkbox: add to / remove from the comparison set (roles only) */
  const toggle = useCallback(
    (item: SelItem) => {
      const rest = selection.filter((it) => !sameItem(it, item));
      if (rest.length < selection.length) {
        update({ sel: rest }, false);
        return;
      }
      const roles = selection.filter((it) => it.type === "r");
      // comparison is capped at the number of distinguishable series colors
      if (item.type === "r" && roles.length >= MAX_COMPARE_ROLES) return;
      update({ sel: [...roles, item] }, false);
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
    (v: boolean) => update({ agents: v }, true),
    [update],
  );

  const setSort = useCallback(
    (v: SortKey) => update({ sort: v }, true),
    [update],
  );

  const setCmpSort = useCallback(
    (v: CompareSortMode) => update({ cmpSort: v }, true),
    [update],
  );
  const setCmpReversed = useCallback(
    (v: boolean) => update({ cmpReversed: v }, true),
    [update],
  );
  const setCmpShowCommon = useCallback(
    (v: boolean) => update({ cmpShowCommon: v }, true),
    [update],
  );
  const setCmpShowUnheld = useCallback(
    (v: boolean) => update({ cmpShowUnheld: v }, true),
    [update],
  );

  return {
    q,
    setQ,
    selection,
    select,
    anchorPerm,
    toggle,
    remove,
    clear,
    showServiceAgents,
    setShowServiceAgents,
    sort,
    setSort,
    cmpSort,
    setCmpSort,
    cmpReversed,
    setCmpReversed,
    cmpShowCommon,
    setCmpShowCommon,
    cmpShowUnheld,
    setCmpShowUnheld,
  };
}

export type ExplorerState = ReturnType<typeof useExplorerState>;
