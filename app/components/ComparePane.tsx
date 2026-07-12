import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { type Dataset, permParts, shortRoleName } from "../lib/data";
import { useT } from "../lib/i18n";
import type { Translate } from "../lib/i18n-data";
import {
  filterPermIds,
  hasPermFilter,
  type ParsedQuery,
  parseQuery,
  stripPermQualifiers,
} from "../lib/search";
import type { ExplorerState } from "../lib/url-state";
import { COMMON_SECTION, seriesColor } from "./colors";
import { MonoName, PermFilterNotice, StageTag } from "./primitives";

type SortMode = "diff" | "name";

/** Wide enough to read typical "service.resource.verb" permission names. */
const PERM_COL_DEFAULT_WIDTH = 320;

/**
 * Membership-driven sections: permId -> bitmask of which roles (by position)
 * hold it. Drives both the "権限名順" grouping and the "差分順" grouping.
 */
function computeMasks(ds: Dataset, roleIndexes: number[]): Map<number, number> {
  const masks = new Map<number, number>();
  roleIndexes.forEach((roleIdx, i) => {
    for (const id of ds.roles[roleIdx].permIds) {
      masks.set(id, (masks.get(id) ?? 0) | (1 << i));
    }
  });
  return masks;
}

function popcount(mask: number): number {
  let n = mask;
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

/** Group key for the matrix's leftmost column, and its rollup permIds. */
interface MatrixGroup {
  key: string;
  permIds: number[];
}

function groupMatrixRows(ds: Dataset, permIds: number[]): MatrixGroup[] {
  const map = new Map<string, number[]>();
  for (const id of permIds) {
    const key = permParts(ds.permissions[id]).group;
    const list = map.get(key);
    if (list) list.push(id);
    else map.set(key, [id]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ids]) => ({ key, permIds: ids.sort((a, b) => a - b) }));
}

/** Dataset-wide "service.resource" group -> permIds, for filling in rows
 * that no selected role holds when "未保持の権限も表示" is enabled. */
function groupToPermIdsMap(ds: Dataset): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let id = 0; id < ds.permissions.length; id++) {
    const key = permParts(ds.permissions[id]).group;
    const list = map.get(key);
    if (list) list.push(id);
    else map.set(key, [id]);
  }
  return map;
}

/** A single colored fragment of a section header label. */
interface LabelPart {
  key: string;
  text: string;
  className: string;
}

/** A "差分順" section: all perms sharing the same holder-bitmask (or the
 * synthetic "unheld by anyone" section, mask = -1). */
interface DiffSection {
  key: string;
  mask: number;
  parts: LabelPart[];
  permIds: number[];
  /** always render this section's header, even when permIds is empty */
  alwaysShow: boolean;
}

const INTERSECTION_SEP = {
  key: "separator",
  text: " ∩ ",
  className: "px-1 text-gray-400 dark:text-gray-600",
};

function labelPartsForMask(
  roleIndexes: number[],
  ds: Dataset,
  mask: number,
  t: Translate,
  reversed: boolean,
): LabelPart[] {
  const n = roleIndexes.length;
  const full = (1 << n) - 1;
  const names = roleIndexes.reduce<{ i: number; name: string }[]>(
    (result, roleIdx, i) => {
      if (mask & (1 << i)) result.push({ i, name: ds.roles[roleIdx].name });
      return result;
    },
    [],
  );
  if (reversed) names.reverse();

  if (mask === full) {
    const parts: LabelPart[] = [
      {
        key: "shared",
        text: t("compare.allShared"),
        className: COMMON_SECTION.text,
      },
    ];
    names.forEach(({ name }, idx) => {
      if (idx > 0) {
        parts.push({ ...INTERSECTION_SEP, key: `separator:${idx}` });
      }
      parts.push({
        key: `role:${name}`,
        text: name,
        className: COMMON_SECTION.text,
      });
    });
    return parts;
  }
  if (names.length === 1) {
    return [
      {
        key: `only:${names[0].i}`,
        text: t("compare.onlyIn", { name: names[0].name }),
        className: seriesColor(names[0].i).text,
      },
    ];
  }
  const parts: LabelPart[] = [];
  names.forEach(({ i, name }, idx) => {
    if (idx > 0) {
      parts.push({ ...INTERSECTION_SEP, key: `separator:${idx}` });
    }
    parts.push({
      key: `role:${i}`,
      text: name,
      className: seriesColor(i).text,
    });
  });
  return parts;
}

/** Small dot-row visualizing which role positions participate in a mask:
 * filled in the role's series color when held, hollow gray otherwise. */
function DotRow({
  mask,
  n,
  reversed,
}: {
  mask: number;
  n: number;
  reversed: boolean;
}) {
  const order = [...Array(n).keys()];
  if (reversed) order.reverse();
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {order.map((i) => {
        const held = (mask & (1 << i)) !== 0;
        return held ? (
          <span
            key={i}
            className={`flex size-2 shrink-0 rounded-full bg-current ${seriesColor(i).text}`}
          />
        ) : (
          <span
            key={i}
            className="size-2 shrink-0 rounded-full border border-gray-300 dark:border-gray-600"
          />
        );
      })}
    </span>
  );
}

/**
 * Tiny inline pie chart for a held/total ratio (the stroke-width trick:
 * a half-radius circle with a stroke as wide as the radius fills the disc).
 */
function SparkPie({ ratio }: { ratio: number }) {
  const C = 2 * Math.PI * 5;
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-2.5 shrink-0 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="10"
      />
      <circle
        cx="10"
        cy="10"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeDasharray={`${ratio * C} ${C}`}
      />
    </svg>
  );
}

interface MatrixState {
  showCommon: boolean;
  showUnheld: boolean;
  collapsed: Set<string>;
  sortMode: SortMode;
  reversed: boolean;
  permW: number;
  roleW: number;
}

type MatrixAction =
  | { type: "setShowCommon"; value: boolean }
  | { type: "setShowUnheld"; value: boolean }
  | { type: "toggleCollapsed"; key: string }
  | { type: "setSortMode"; value: SortMode }
  | { type: "toggleReversed" }
  | { type: "setColumnWidth"; column: "perm" | "role"; value: number }
  | { type: "resetForRoleCount"; sortMode: SortMode }
  | { type: "resetRoleWidth"; value: number };

function createMatrixState(n: number, roleW: number): MatrixState {
  return {
    showCommon: true,
    showUnheld: false,
    collapsed: new Set(),
    sortMode: n === 2 ? "diff" : "name",
    reversed: false,
    permW: PERM_COL_DEFAULT_WIDTH,
    roleW,
  };
}

function matrixReducer(state: MatrixState, action: MatrixAction): MatrixState {
  switch (action.type) {
    case "setShowCommon":
      return { ...state, showCommon: action.value };
    case "setShowUnheld":
      return { ...state, showUnheld: action.value };
    case "toggleCollapsed": {
      const collapsed = new Set(state.collapsed);
      if (collapsed.has(action.key)) collapsed.delete(action.key);
      else collapsed.add(action.key);
      return { ...state, collapsed };
    }
    case "setSortMode":
      return { ...state, sortMode: action.value };
    case "toggleReversed":
      return { ...state, reversed: !state.reversed };
    case "setColumnWidth":
      return action.column === "perm"
        ? { ...state, permW: action.value }
        : { ...state, roleW: action.value };
    case "resetForRoleCount":
      return { ...state, sortMode: action.sortMode };
    case "resetRoleWidth":
      return { ...state, roleW: action.value };
  }
}

function MatrixView({
  ds,
  state,
  roleIndexes,
  parsed,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndexes: number[];
  parsed: ParsedQuery;
}) {
  const t = useT();
  const n = roleIndexes.length;
  const masks = useMemo(() => computeMasks(ds, roleIndexes), [ds, roleIndexes]);
  const full = (1 << n) - 1;

  // resizable columns: both th edges carry a drag handle. Role columns get
  // a shared width sized to mean short-name length + 1.5σ so most names fit
  // without spreading the checks too far apart.
  const defaultRoleW = useMemo(() => {
    const lens = roleIndexes.map((i) => {
      const name = ds.roles[i].name;
      const dot = name.indexOf(".");
      return (dot === -1 ? shortRoleName(name) : name.slice(dot + 1)).length;
    });
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd = Math.sqrt(
      lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length,
    );
    // ~6.6px/char at font-mono text-[11px], plus cell padding
    return Math.round(
      Math.min(176, Math.max(88, (mean + 1.5 * sd) * 6.6 + 16)),
    );
  }, [ds, roleIndexes]);

  const [matrix, dispatch] = useReducer(
    matrixReducer,
    { n, roleW: defaultRoleW },
    ({ n: initialN, roleW: initialRoleW }) =>
      createMatrixState(initialN, initialRoleW),
  );
  useEffect(() => {
    dispatch({
      type: "resetForRoleCount",
      sortMode: n === 2 ? "diff" : "name",
    });
  }, [n]);
  useEffect(() => {
    dispatch({ type: "resetRoleWidth", value: defaultRoleW });
  }, [defaultRoleW]);
  const {
    showCommon,
    showUnheld,
    collapsed,
    sortMode,
    reversed,
    permW,
    roleW,
  } = matrix;
  const colDrag = useRef<{ x: number; w: number; col: "perm" | "role" } | null>(
    null,
  );
  const startColDrag =
    (col: "perm" | "role", w: number) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      colDrag.current = { x: e.clientX, w, col };
    };
  const moveColDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = colDrag.current;
    if (!d) return;
    const next = d.w + e.clientX - d.x;
    if (d.col === "perm") {
      dispatch({
        type: "setColumnWidth",
        column: "perm",
        value: Math.min(640, Math.max(160, next)),
      });
    } else {
      dispatch({
        type: "setColumnWidth",
        column: "role",
        value: Math.min(240, Math.max(64, next)),
      });
    }
  };
  const endColDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    colDrag.current = null;
  };
  const colResizerProps = (col: "perm" | "role", w: number) => ({
    onPointerDown: startColDrag(col, w),
    onPointerMove: moveColDrag,
    onPointerUp: endColDrag,
    className:
      "absolute inset-y-0 -right-1 z-30 hidden w-2 cursor-col-resize hover:bg-purple-300/50 md:block dark:hover:bg-purple-700/50",
  });

  const commonCount = useMemo(() => {
    let c = 0;
    for (const mask of masks.values()) if (mask === full) c++;
    return c;
  }, [masks, full]);

  const permIds = useMemo(() => {
    const ids = filterPermIds(ds, [...masks.keys()], parsed);
    if (showCommon) return ids.sort((a, b) => a - b);
    return ids.filter((id) => masks.get(id) !== full).sort((a, b) => a - b);
  }, [ds, masks, full, showCommon, parsed]);

  const groupToPermIds = useMemo(() => groupToPermIdsMap(ds), [ds]);

  // dataset-wide permissions in groups touched by permIds, held by nobody
  // selected — used both to append "unheld" rows within name-order groups,
  // and to build the standalone "未保持" section in diff-order.
  const unheldPermIds = useMemo(() => {
    if (!showUnheld) return [] as number[];
    const touchedGroups = new Set(
      permIds.map((id) => permParts(ds.permissions[id]).group),
    );
    const present = new Set(permIds);
    const all: number[] = [];
    for (const key of touchedGroups) {
      const ids = groupToPermIds.get(key) ?? [];
      for (const id of ids) {
        if (!masks.has(id) && !present.has(id)) all.push(id);
      }
    }
    return filterPermIds(ds, all, parsed);
  }, [ds, permIds, showUnheld, groupToPermIds, masks, parsed]);

  const groups = useMemo(() => {
    const base = groupMatrixRows(ds, permIds);
    if (!showUnheld) return base;
    // for each group already shown, add dataset-wide permissions of that
    // group that none of the selected roles hold (all-"-" rows)
    return base.map((g) => {
      const key = permParts(ds.permissions[g.permIds[0]]).group;
      const all = groupToPermIds.get(key) ?? [];
      const present = new Set(g.permIds);
      const unheld = filterPermIds(
        ds,
        all.filter((id) => !masks.has(id) && !present.has(id)),
        parsed,
      );
      if (unheld.length === 0) return g;
      return {
        key: g.key,
        permIds: [...g.permIds, ...unheld].sort((a, b) => a - b),
      };
    });
  }, [ds, permIds, showUnheld, groupToPermIds, masks, parsed]);

  // "差分順": group permIds by holder-mask. Section order: single-role
  // sections first, then combination sections by popcount asc then mask asc
  // (A のみ -> B のみ -> ... -> A·B -> ... -> B·C), then 共通 (when shown) at
  // the very end, and finally a synthetic "unheld by anyone" section
  // (mask = -1) after that. When showUnheld is on, every non-empty subset of
  // the roles is shown (even with 0 permIds) to complete the lattice; the
  // whole order flips when `reversed` is set.
  const diffSections = useMemo<DiffSection[]>(() => {
    const byMask = new Map<number, number[]>();
    for (const id of permIds) {
      const mask = masks.get(id) ?? 0;
      const list = byMask.get(mask);
      if (list) list.push(id);
      else byMask.set(mask, [id]);
    }
    const singleMasks = roleIndexes.map((_, i) => 1 << i);
    const presentMasks = new Set(byMask.keys());
    for (const m of singleMasks) presentMasks.add(m);
    if (showUnheld) {
      for (let m = 1; m <= full; m++) presentMasks.add(m);
    }
    if (showCommon) presentMasks.add(full);
    else presentMasks.delete(full);

    const nonCommonMasks = [...presentMasks]
      .filter((m) => m !== full)
      .sort((a, b) => {
        const pa = popcount(a);
        const pb = popcount(b);
        return pa !== pb ? pa - pb : a - b;
      });
    const orderedMasks = showCommon
      ? [...nonCommonMasks, full]
      : nonCommonMasks;
    if (reversed) orderedMasks.reverse();

    const isSingle = (mask: number) => popcount(mask) === 1;
    const sections: DiffSection[] = orderedMasks.map((mask) => {
      const parts = labelPartsForMask(roleIndexes, ds, mask, t, reversed);
      return {
        key: `sec:${mask}`,
        mask,
        parts,
        permIds: (byMask.get(mask) ?? []).sort((a, b) => a - b),
        alwaysShow: mask === full || isSingle(mask) || showUnheld,
      };
    });
    if (unheldPermIds.length > 0) {
      sections.push({
        key: "sec:-1",
        mask: -1,
        parts: [
          {
            key: "unheld",
            text: t("compare.unheld"),
            className: "text-gray-400",
          },
        ],
        permIds: [...unheldPermIds].sort((a, b) => a - b),
        alwaysShow: false,
      });
    }
    return sections;
  }, [
    ds,
    roleIndexes,
    permIds,
    masks,
    unheldPermIds,
    showCommon,
    showUnheld,
    reversed,
    full,
    t,
  ]);

  const totalRows = useMemo(() => {
    if (sortMode === "name") {
      return groups.reduce((sum, g) => sum + g.permIds.length, 0);
    }
    return diffSections.reduce((sum, s) => sum + s.permIds.length, 0);
  }, [sortMode, groups, diffSections]);

  const groupCount = useMemo(() => {
    if (sortMode === "name") return groups.length;
    return diffSections.reduce(
      (sum, s) => sum + groupMatrixRows(ds, s.permIds).length,
      0,
    );
  }, [sortMode, groups, diffSections, ds]);

  // default: expand groups when the overall row count is small enough to scan
  const defaultOpen = totalRows <= 60;
  const isOpen = (key: string) =>
    collapsed.has(key) ? !defaultOpen : defaultOpen;
  const isSectionOpen = (key: string) => !collapsed.has(key);
  const toggle = (key: string) => dispatch({ type: "toggleCollapsed", key });

  return (
    <div className="flex h-full min-w-0 flex-col">
      <MatrixToolbar
        commonCount={commonCount}
        groupCount={groupCount}
        reversed={reversed}
        showCommon={showCommon}
        showUnheld={showUnheld}
        sortMode={sortMode}
        totalRows={totalRows}
        onSetSortMode={(value) => dispatch({ type: "setSortMode", value })}
        onToggleReversed={() => dispatch({ type: "toggleReversed" })}
        onSetShowCommon={(value) => dispatch({ type: "setShowCommon", value })}
        onSetShowUnheld={(value) => dispatch({ type: "setShowUnheld", value })}
      />
      <MatrixTable
        ds={ds}
        state={state}
        roleIndexes={roleIndexes}
        n={n}
        groups={groups}
        diffSections={diffSections}
        masks={masks}
        sortMode={sortMode}
        reversed={reversed}
        permW={permW}
        roleW={roleW}
        colResizerProps={colResizerProps}
        isOpen={isOpen}
        isSectionOpen={isSectionOpen}
        toggle={toggle}
        t={t}
      />
    </div>
  );
}

function MatrixToolbar({
  commonCount,
  groupCount,
  reversed,
  showCommon,
  showUnheld,
  sortMode,
  totalRows,
  onSetSortMode,
  onToggleReversed,
  onSetShowCommon,
  onSetShowUnheld,
}: {
  commonCount: number;
  groupCount: number;
  reversed: boolean;
  showCommon: boolean;
  showUnheld: boolean;
  sortMode: SortMode;
  totalRows: number;
  onSetSortMode: (value: SortMode) => void;
  onToggleReversed: () => void;
  onSetShowCommon: (value: boolean) => void;
  onSetShowUnheld: (value: boolean) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 px-3 py-1.5 dark:border-gray-800">
      <div className="flex shrink-0 items-center gap-0.5 rounded border border-gray-200 p-0.5 dark:border-gray-700">
        <button
          type="button"
          onClick={() => onSetSortMode("diff")}
          className={`whitespace-nowrap rounded px-2 py-0.5 text-sm cursor-pointer ${
            sortMode === "diff"
              ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          {t("compare.sortDiff")}
        </button>
        <button
          type="button"
          onClick={() => onSetSortMode("name")}
          className={`whitespace-nowrap rounded px-2 py-0.5 text-sm cursor-pointer ${
            sortMode === "name"
              ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          {t("compare.sortName")}
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleReversed}
        title={reversed ? t("compare.sortAsc") : t("compare.sortDesc")}
        aria-label={reversed ? t("compare.sortAsc") : t("compare.sortDesc")}
        className="flex shrink-0 items-center rounded border border-gray-200 p-1 text-gray-400 hover:text-gray-600 cursor-pointer dark:border-gray-700 dark:hover:text-gray-300"
      >
        {reversed ? (
          <ArrowUp size={14} className="inline-block" />
        ) : (
          <ArrowDown size={14} className="inline-block" />
        )}
      </button>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={showCommon}
          onChange={(e) => onSetShowCommon(e.target.checked)}
          className="accent-purple-600"
        />
        {t("compare.showCommon", { n: commonCount })}
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={showUnheld}
          onChange={(e) => onSetShowUnheld(e.target.checked)}
          className="accent-purple-600"
        />
        {t("compare.showUnheld")}
      </label>
      <span className="ml-auto text-[10px] text-gray-400">
        {t("compare.groupsAndRows", { groups: groupCount, rows: totalRows })}
      </span>
    </div>
  );
}

type ColumnResizerProps = {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  className: string;
};

function MatrixGroupRows({
  ds,
  state,
  roleIndexes,
  masks,
  group,
  collapseKey,
  isOpen,
  toggle,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndexes: number[];
  masks: Map<number, number>;
  group: MatrixGroup;
  collapseKey: string;
  isOpen: (key: string) => boolean;
  toggle: (key: string) => void;
}) {
  const opened = isOpen(collapseKey);
  return (
    <Fragment>
      <tr
        className="cursor-pointer border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:bg-gray-900"
        onClick={() => toggle(collapseKey)}
      >
        <td className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50/60 px-2 py-1 dark:border-gray-800 dark:bg-gray-900/40">
          <span className="flex items-center gap-1.5 overflow-hidden">
            <span className="flex w-3 shrink-0 text-gray-400">
              {opened ? (
                <ChevronDown size={13} className="inline-block" />
              ) : (
                <ChevronRight size={13} className="inline-block" />
              )}
            </span>
            <span className="truncate font-mono font-medium text-gray-700 dark:text-gray-300">
              <MonoName name={group.key} />
              <span className="text-gray-400">.*</span>
            </span>
            <span className="shrink-0 text-[10px] text-gray-400">
              {group.permIds.length}
            </span>
          </span>
        </td>
        {roleIndexes.map((roleIdx, i) => {
          const color = seriesColor(i);
          const held = group.permIds.filter(
            (id) => (masks.get(id) ?? 0) & (1 << i),
          ).length;
          const className =
            held === group.permIds.length
              ? color.text
              : held === 0
                ? "text-gray-300 dark:text-gray-700"
                : "text-gray-500 dark:text-gray-400";
          return (
            <td
              key={roleIdx}
              className="border-l border-gray-100 px-1 py-1 text-center tabular-nums dark:border-gray-800"
            >
              <span className="inline-flex items-center gap-1 text-xs">
                <span className={`flex ${color.text}`}>
                  <SparkPie ratio={held / group.permIds.length} />
                </span>
                <span className={`min-w-[5ch] text-right ${className}`}>
                  {held}/{group.permIds.length}
                </span>
              </span>
            </td>
          );
        })}
        <td aria-hidden="true" tabIndex={-1} />
      </tr>
      {opened &&
        group.permIds.map((id) => {
          const name = ds.permissions[id];
          const mask = masks.get(id) ?? 0;
          return (
            <tr
              key={id}
              className="border-b border-gray-50 hover:bg-rose-50 dark:border-gray-900 dark:hover:bg-rose-950/30"
            >
              <td className="sticky left-0 z-10 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                <button
                  type="button"
                  onClick={() => state.anchorPerm(name)}
                  title={ds.permMeta[id]?.description ?? name}
                  aria-label={name}
                  className="block w-full cursor-pointer truncate py-0.5 pr-2 pl-7 text-left font-mono hover:underline"
                >
                  <span className="text-gray-400 dark:text-gray-500">
                    {permParts(name).group}.
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {permParts(name).verb}
                  </span>
                  {ds.permMeta[id]?.stage && (
                    <span className="ml-1.5">
                      <StageTag stage={ds.permMeta[id]?.stage} />
                    </span>
                  )}
                </button>
              </td>
              {roleIndexes.map((roleIdx, i) => {
                const color = seriesColor(i);
                const has = (mask & (1 << i)) !== 0;
                return (
                  <td
                    key={roleIdx}
                    className="border-l border-gray-100 text-center dark:border-gray-800"
                  >
                    {has ? (
                      <Check
                        size={16}
                        className={`inline-block ${color.text}`}
                      />
                    ) : (
                      <span className="text-gray-300 dark:text-gray-700">
                        −
                      </span>
                    )}
                  </td>
                );
              })}
              <td aria-hidden="true" tabIndex={-1} />
            </tr>
          );
        })}
    </Fragment>
  );
}

function MatrixSectionRows({
  ds,
  state,
  roleIndexes,
  n,
  masks,
  section,
  reversed,
  isGroupOpen,
  isSectionOpen,
  toggle,
  t,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndexes: number[];
  n: number;
  masks: Map<number, number>;
  section: DiffSection;
  reversed: boolean;
  isGroupOpen: (key: string) => boolean;
  isSectionOpen: (key: string) => boolean;
  toggle: (key: string) => void;
  t: Translate;
}) {
  const sectionOpen = isSectionOpen(section.key);
  const sectionGroups = groupMatrixRows(ds, section.permIds);
  const isEmpty = section.permIds.length === 0;
  return (
    <Fragment>
      <tr
        className="cursor-pointer border-y border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
        onClick={() => toggle(section.key)}
      >
        <td
          colSpan={roleIndexes.length + 2}
          className="sticky left-0 z-10 bg-white px-3 py-1.5 dark:bg-gray-950"
        >
          <span className="flex items-center gap-2">
            <span className="flex w-3.5 shrink-0 text-gray-400">
              {sectionOpen ? (
                <ChevronDown size={14} className="inline-block" />
              ) : (
                <ChevronRight size={14} className="inline-block" />
              )}
            </span>
            <DotRow
              mask={section.mask < 0 ? 0 : section.mask}
              n={n}
              reversed={reversed}
            />
            <span className="text-sm font-semibold">
              {section.parts.map((part) => (
                <span key={part.key} className={part.className}>
                  {part.text}
                </span>
              ))}
            </span>
            <span className="text-xs text-gray-400">
              {section.permIds.length}
            </span>
          </span>
        </td>
      </tr>
      {sectionOpen && isEmpty && (
        <tr className="border-b border-gray-50 dark:border-gray-900">
          <td
            colSpan={roleIndexes.length + 2}
            className="py-0.5 pl-9 text-xs text-gray-400"
          >
            {t("compare.none")}
          </td>
        </tr>
      )}
      {sectionOpen &&
        sectionGroups.map((group) => (
          <MatrixGroupRows
            key={`${section.mask}/${group.key}`}
            ds={ds}
            state={state}
            roleIndexes={roleIndexes}
            masks={masks}
            group={group}
            collapseKey={`${section.mask}/${group.key}`}
            isOpen={isGroupOpen}
            toggle={toggle}
          />
        ))}
    </Fragment>
  );
}

function MatrixTable({
  ds,
  state,
  roleIndexes,
  n,
  groups,
  diffSections,
  masks,
  sortMode,
  reversed,
  permW,
  roleW,
  colResizerProps,
  isOpen,
  isSectionOpen,
  toggle,
  t,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndexes: number[];
  n: number;
  groups: MatrixGroup[];
  diffSections: DiffSection[];
  masks: Map<number, number>;
  sortMode: SortMode;
  reversed: boolean;
  permW: number;
  roleW: number;
  colResizerProps: (
    column: "perm" | "role",
    width: number,
  ) => ColumnResizerProps;
  isOpen: (key: string) => boolean;
  isSectionOpen: (key: string) => boolean;
  toggle: (key: string) => void;
  t: Translate;
}) {
  const bodyRows: ReactNode[] = [];
  if (sortMode === "name") {
    const orderedGroups = reversed ? [...groups].reverse() : groups;
    for (const group of orderedGroups) {
      bodyRows.push(
        <MatrixGroupRows
          key={group.key}
          ds={ds}
          state={state}
          roleIndexes={roleIndexes}
          masks={masks}
          group={group}
          collapseKey={group.key}
          isOpen={isOpen}
          toggle={toggle}
        />,
      );
    }
  } else {
    for (const section of diffSections) {
      if (!section.alwaysShow && section.permIds.length === 0) continue;
      bodyRows.push(
        <MatrixSectionRows
          key={section.key}
          ds={ds}
          state={state}
          roleIndexes={roleIndexes}
          n={n}
          masks={masks}
          section={section}
          reversed={reversed}
          isGroupOpen={isOpen}
          isSectionOpen={isSectionOpen}
          toggle={toggle}
          t={t}
        />,
      );
    }
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto">
      <table
        className="w-full table-fixed border-collapse text-sm"
        style={{ minWidth: permW + roleIndexes.length * roleW }}
      >
        <thead>
          <tr className="sticky top-0 z-10 bg-white dark:bg-gray-950">
            <th
              className="sticky left-0 z-20 border-r border-b border-gray-200 bg-white px-2 py-1.5 text-left align-bottom dark:border-gray-800 dark:bg-gray-950"
              style={{ width: permW }}
            >
              <span className="text-[10px] font-normal text-gray-400">
                {t("compare.permissionColumn")}
              </span>
              <div {...colResizerProps("perm", permW)} />
            </th>
            {roleIndexes.map((roleIdx, i) => {
              const role = ds.roles[roleIdx];
              const color = seriesColor(i);
              const dot = role.name.indexOf(".");
              const head = dot === -1 ? "roles/" : role.name.slice(0, dot + 1);
              const tail =
                dot === -1
                  ? shortRoleName(role.name)
                  : role.name.slice(dot + 1);
              return (
                <th
                  key={roleIdx}
                  className="relative border-b border-l border-gray-100 border-b-gray-200 px-1 py-1.5 text-center align-bottom dark:border-gray-800 dark:border-b-gray-800"
                  style={{ width: roleW }}
                  title={role.name}
                >
                  <span
                    className={`block truncate font-mono text-[10px] font-normal opacity-70 ${color.text}`}
                  >
                    {head}
                  </span>
                  <span
                    className={`block truncate font-mono text-[11px] font-semibold ${color.text}`}
                  >
                    {tail}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {role.permIds.length}
                  </span>
                  <div {...colResizerProps("role", roleW)} />
                </th>
              );
            })}
            <th
              aria-hidden="true"
              tabIndex={-1}
              className="border-b border-gray-200 dark:border-gray-800"
            />
          </tr>
        </thead>
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  );
}

export function ComparePane({
  ds,
  state,
  roleIndexes,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndexes: number[];
}) {
  const t = useT();
  const parsed = useMemo(() => parseQuery(state.q), [state.q]);
  const filterActive = hasPermFilter(parsed);
  const filterTerms = [
    ...parsed.s.map((t) => `s:${t}`),
    ...parsed.p.map((t) => `p:${t}`),
  ];

  // union sizes across the selected roles, before/after the s:/p: filter —
  // drives the PermFilterNotice count
  const masks = useMemo(() => computeMasks(ds, roleIndexes), [ds, roleIndexes]);
  const unionTotal = masks.size;
  const unionShown = useMemo(
    () => filterPermIds(ds, [...masks.keys()], parsed).length,
    [ds, masks, parsed],
  );

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {t("compare.title", { n: roleIndexes.length })}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {roleIndexes.map((roleIdx, i) => {
              const role = ds.roles[roleIdx];
              const c = seriesColor(i);
              return (
                <span
                  key={roleIdx}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${c.bgSoft} ${c.text}`}
                >
                  <MonoName name={role.name} />
                  <span className="opacity-70">{role.permIds.length}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
      {filterActive && (
        <PermFilterNotice
          terms={filterTerms}
          shown={unionShown}
          total={unionTotal}
          onClear={() => state.setQ(stripPermQualifiers(state.q))}
        />
      )}
      <div className="min-h-0 min-w-0 flex-1">
        <MatrixView
          ds={ds}
          state={state}
          roleIndexes={roleIndexes}
          parsed={parsed}
        />
      </div>
    </div>
  );
}
