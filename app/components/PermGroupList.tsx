import { ChevronDown, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { type Dataset, permParts } from "../lib/data";
import { useT } from "../lib/i18n";
import { StageTag } from "./primitives";

/** Threshold above which the list defaults to collapsed-by-resource. */
const AUTO_COLLAPSE_THRESHOLD = 200;
/** Below this size the "collapse all / expand all" row isn't worth showing. */
const BULK_TOGGLE_MIN = 10;

interface FlatRow {
  type: "flat";
  id: number;
  name: string;
}

interface GroupRow {
  type: "group";
  /** collapse key: "service" or "service.resource" */
  key: string;
  permIds: number[];
  /** whether this group is currently collapsed */
  collapsed: boolean;
}

type Row = FlatRow | GroupRow;

/**
 * Walk permIds (assumed name-sorted, i.e. id order) and produce the rows to
 * render: every contiguous run sharing a resource group (service.resource,
 * or service when there's no resource) is preceded by a group placeholder
 * row. When the group is collapsed, only the placeholder row is emitted;
 * otherwise the placeholder is followed by the run's flat rows.
 */
export function buildRows(
  ds: Dataset,
  permIds: number[],
  collapsed: Set<string>,
): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < permIds.length) {
    const parts = permParts(ds.permissions[permIds[i]]);
    const key = parts.group || parts.service;
    const run: number[] = [];
    while (i < permIds.length) {
      const p = permParts(ds.permissions[permIds[i]]);
      const rk = p.group || p.service;
      if (rk !== key) break;
      run.push(permIds[i]);
      i++;
    }
    const isCollapsed = collapsed.has(key);
    rows.push({ type: "group", key, permIds: run, collapsed: isCollapsed });
    if (!isCollapsed) {
      for (const id of run) {
        rows.push({ type: "flat", id, name: ds.permissions[id] });
      }
    }
  }
  return rows;
}

/** Every distinct "service.resource" key across permIds (used by "collapse all"). */
export function allResourceKeys(ds: Dataset, permIds: number[]): string[] {
  const keys = new Set<string>();
  for (const id of permIds) {
    const parts = permParts(ds.permissions[id]);
    keys.add(parts.group || parts.service);
  }
  return [...keys];
}

function GroupRowView({
  row,
  onToggle,
}: {
  row: GroupRow;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        row.collapsed
          ? t("permgroup.clickToExpand")
          : t("permgroup.collapseInto", { key: row.key })
      }
      className="flex w-full items-center gap-1.5 border-t border-gray-100 px-2 py-0.5 text-left text-[11px] hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 cursor-pointer"
    >
      <span className="flex w-3.5 shrink-0 justify-center text-gray-300 dark:text-gray-600">
        {row.collapsed ? (
          <ChevronRight size={12} className="inline-block" />
        ) : (
          <ChevronDown size={12} className="inline-block" />
        )}
      </span>
      <span className="font-mono text-gray-400 dark:text-gray-500">
        {row.key}.*
      </span>
      <span className="text-gray-400">{row.permIds.length}</span>
    </button>
  );
}

function FlatRowView({
  ds,
  row,
  onSelectPerm,
}: {
  ds: Dataset;
  row: FlatRow;
  onSelectPerm: (permName: string) => void;
}) {
  const meta = ds.permMeta[row.id];
  const parts = permParts(row.name);
  const hasResource = parts.resource.length > 0;

  return (
    <button
      type="button"
      onClick={() => onSelectPerm(row.name)}
      title={meta?.description ?? row.name}
      className="flex w-full items-baseline gap-1.5 border-b border-gray-50 py-0.5 pr-2 pl-2 text-left text-sm hover:bg-rose-50 dark:border-gray-900 dark:hover:bg-rose-950/40 cursor-pointer"
    >
      <span className="w-3.5 shrink-0" />
      <span className="truncate font-mono">
        <span className="text-gray-400 dark:text-gray-500">
          {parts.service}.{hasResource ? `${parts.resource}.` : ""}
        </span>
        <span className="text-gray-700 dark:text-gray-300">{parts.verb}</span>
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <StageTag stage={meta?.stage} />
        {meta?.title && (
          <span className="ml-auto max-w-56 truncate text-right text-xs text-gray-300 dark:text-gray-600">
            {meta.title}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Flat, resource-grouped permission list. Permissions render one per line
 * in name order, grouped by "service.resource"; each group is preceded by a
 * clickable placeholder row that folds or unfolds its run. Shared by the
 * detail pane, comparison sections and the reverse-lookup pane.
 */
export function PermGroupList({
  ds,
  permIds,
  defaultOpen,
  onSelectPerm,
}: {
  ds: Dataset;
  permIds: number[];
  defaultOpen?: boolean;
  onSelectPerm: (permName: string) => void;
}) {
  const t = useT();
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    defaultOpen !== true && permIds.length > AUTO_COLLAPSE_THRESHOLD
      ? new Set(allResourceKeys(ds, permIds))
      : new Set(),
  );

  // permIds changed: reset collapse state back to the default (render-time
  // reset, no effect needed — mirrors RoleList's prevQ ref pattern)
  const prevPermIds = useRef(permIds);
  if (prevPermIds.current !== permIds) {
    prevPermIds.current = permIds;
    const next =
      defaultOpen !== true && permIds.length > AUTO_COLLAPSE_THRESHOLD
        ? new Set(allResourceKeys(ds, permIds))
        : new Set<string>();
    setCollapsed(next);
  }

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const collapseAll = () => setCollapsed(new Set(allResourceKeys(ds, permIds)));
  const expandAll = () => setCollapsed(new Set());

  const rows = buildRows(ds, permIds, collapsed);

  return (
    <div className="flex h-full flex-col text-sm">
      {permIds.length >= BULK_TOGGLE_MIN && (
        <div className="flex justify-end gap-2 border-b border-gray-100 px-2 py-0.5 text-[10px] dark:border-gray-800">
          <button
            type="button"
            onClick={collapseAll}
            className="text-gray-400 hover:text-gray-600 hover:underline cursor-pointer dark:hover:text-gray-300"
          >
            {t("permgroup.collapseAll")}
          </button>
          <button
            type="button"
            onClick={expandAll}
            className="text-gray-400 hover:text-gray-600 hover:underline cursor-pointer dark:hover:text-gray-300"
          >
            {t("permgroup.expandAll")}
          </button>
        </div>
      )}
      <Virtuoso
        className="min-h-0 flex-1"
        totalCount={rows.length}
        computeItemKey={(i) => {
          const row = rows[i];
          return row.type === "group" ? `g:${row.key}` : `f:${row.id}`;
        }}
        itemContent={(i) => {
          const row = rows[i];
          return row.type === "group" ? (
            <GroupRowView row={row} onToggle={() => toggle(row.key)} />
          ) : (
            <FlatRowView ds={ds} row={row} onSelectPerm={onSelectPerm} />
          );
        }}
      />
    </div>
  );
}
