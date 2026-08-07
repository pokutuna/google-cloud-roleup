import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { type Dataset, permParts } from "../lib/data";
import {
  isGroupHighlighted,
  isPermHighlighted,
  type ResolvedHighlight,
} from "../lib/highlight";
import { useT } from "../lib/i18n";
import {
  allResourceKeys,
  buildRows,
  type FlatRow,
  findHighlightRow,
  type GroupRow,
} from "./perm-group-list-utils";
import { CopyLinkButton, HIGHLIGHT_ROW, StageTag } from "./primitives";

/** Threshold above which the list defaults to collapsed-by-resource. */
const AUTO_COLLAPSE_THRESHOLD = 200;

function GroupRowView({
  row,
  highlighted,
  onToggle,
}: {
  row: GroupRow;
  highlighted: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <div
      className={`group flex w-full items-center gap-1.5 border-t border-gray-100 pr-2 text-[11px] hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 ${
        highlighted ? HIGHLIGHT_ROW : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        title={
          row.collapsed
            ? t("permgroup.clickToExpand")
            : t("permgroup.collapseInto", { key: row.key })
        }
        className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-0.5 text-left cursor-pointer"
      >
        <span className="flex w-3.5 shrink-0 justify-center text-gray-300 dark:text-gray-600">
          {row.collapsed ? (
            <ChevronRight size={12} className="inline-block" />
          ) : (
            <ChevronDown size={12} className="inline-block" />
          )}
        </span>
        <span className="truncate font-mono text-gray-400 dark:text-gray-500">
          {row.key}.*
        </span>
        <span className="text-gray-400">{row.permIds.length}</span>
      </button>
      <CopyLinkButton
        target={`${row.key}.*`}
        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      />
    </div>
  );
}

function FlatRowView({
  ds,
  row,
  highlighted,
  onSelectPerm,
}: {
  ds: Dataset;
  row: FlatRow;
  highlighted: boolean;
  onSelectPerm: (permName: string) => void;
}) {
  const meta = ds.permMeta[row.id];
  const parts = permParts(row.name);
  const hasResource = parts.resource.length > 0;

  return (
    <div
      className={`group flex w-full items-baseline gap-1.5 border-b border-gray-50 pr-2 text-sm hover:bg-rose-50 dark:border-gray-900 dark:hover:bg-rose-950/40 ${
        highlighted ? HIGHLIGHT_ROW : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectPerm(row.name)}
        title={meta?.description ?? row.name}
        className="flex min-w-0 flex-1 items-baseline gap-1.5 py-0.5 pl-2 text-left cursor-pointer"
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
      <CopyLinkButton
        target={row.name}
        className="self-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      />
    </div>
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
  highlight,
  onSelectPerm,
}: {
  ds: Dataset;
  permIds: number[];
  defaultOpen?: boolean;
  highlight?: ResolvedHighlight | null;
  onSelectPerm: (permName: string) => void;
}) {
  const t = useT();
  // the highlighted group always starts unfolded, so a shared link lands on a
  // visible row even when the list would otherwise auto-collapse
  const initialCollapsed = (ids: number[]) => {
    const next =
      defaultOpen !== true && ids.length > AUTO_COLLAPSE_THRESHOLD
        ? new Set(allResourceKeys(ds, ids))
        : new Set<string>();
    if (highlight) next.delete(highlight.groupKey);
    return next;
  };
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    initialCollapsed(permIds),
  );

  // permIds or the highlight changed: reset collapse state back to the default
  // (render-time reset, no effect needed — mirrors RoleList's prevQ ref pattern).
  // A highlight whose group is already unfolded needs no reset — that is the
  // copy-link button pointing ?hl= at a row the user is looking at, and
  // re-collapsing the list under the click would lose their manual expansions.
  const prevPermIds = useRef(permIds);
  const prevHighlight = useRef(highlight?.raw);
  const highlightShown = highlight ? !collapsed.has(highlight.groupKey) : false;
  if (
    prevPermIds.current !== permIds ||
    (prevHighlight.current !== highlight?.raw && !highlightShown)
  ) {
    prevPermIds.current = permIds;
    prevHighlight.current = highlight?.raw;
    setCollapsed(initialCollapsed(permIds));
  } else if (prevHighlight.current !== highlight?.raw) {
    prevHighlight.current = highlight?.raw;
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

  // scroll the highlighted row into view once per highlight target. Virtuoso
  // needs the list measured first, hence the rAF; rows are recomputed every
  // render, so the effect keys on the raw target rather than on `rows`.
  const virtuoso = useRef<VirtuosoHandle>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const target = highlight?.raw;
  const targetPermId = highlight?.permId;
  const targetGroup = highlight?.groupKey;
  useEffect(() => {
    if (!target || targetGroup === undefined) return;
    const frame = requestAnimationFrame(() => {
      const index = findHighlightRow(
        rowsRef.current,
        targetPermId,
        targetGroup,
      );
      if (index === -1) return;
      virtuoso.current?.scrollToIndex({ index, align: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [target, targetPermId, targetGroup]);

  return (
    <div className="flex h-full flex-col text-sm">
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
      <Virtuoso
        ref={virtuoso}
        className="min-h-0 flex-1"
        totalCount={rows.length}
        computeItemKey={(i) => {
          const row = rows[i];
          return row.type === "group" ? `g:${row.key}` : `f:${row.id}`;
        }}
        itemContent={(i) => {
          const row = rows[i];
          return row.type === "group" ? (
            <GroupRowView
              row={row}
              highlighted={isGroupHighlighted(highlight, row.key)}
              onToggle={() => toggle(row.key)}
            />
          ) : (
            <FlatRowView
              ds={ds}
              row={row}
              highlighted={isPermHighlighted(ds, highlight ?? null, row.id)}
              onSelectPerm={onSelectPerm}
            />
          );
        }}
      />
    </div>
  );
}
