import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { badgesForPermissions } from "../lib/badges";
import { type Dataset, permParts, shortRoleName } from "../lib/data";
import { type Translate, useT } from "../lib/i18n";
import {
  filterPermIds,
  hasPermFilter,
  type ParsedQuery,
  parseQuery,
  stripPermQualifiers,
} from "../lib/search";
import type { ExplorerState } from "../lib/url-state";
import { COMMON_SECTION, seriesColor } from "./colors";
import { BadgeTag, MonoName, PermFilterNotice } from "./primitives";

type SortMode = "diff" | "name";

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

function labelPartsForMask(
  roleIndexes: number[],
  ds: Dataset,
  mask: number,
  t: Translate,
): LabelPart[] {
  const n = roleIndexes.length;
  const full = (1 << n) - 1;
  if (mask === full) {
    return [{ text: t("compare.common"), className: COMMON_SECTION.text }];
  }
  const names = roleIndexes
    .map((roleIdx, i) => ({ i, name: ds.roles[roleIdx].name }))
    .filter(({ i }) => mask & (1 << i));
  if (names.length === 1) {
    return [
      {
        text: t("compare.onlyIn", { name: names[0].name }),
        className: seriesColor(names[0].i).text,
      },
    ];
  }
  const parts: LabelPart[] = [];
  names.forEach(({ i, name }, idx) => {
    if (idx > 0) {
      parts.push({
        text: " · ",
        className: "text-gray-400 dark:text-gray-600",
      });
    }
    parts.push({ text: name, className: seriesColor(i).text });
  });
  return parts;
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
      className="size-3 shrink-0 -rotate-90"
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
  const [showCommon, setShowCommon] = useState(true);
  const [showUnheld, setShowUnheld] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>(n === 2 ? "diff" : "name");
  const [sortModeForN, setSortModeForN] = useState(n);
  if (sortModeForN !== n) {
    setSortModeForN(n);
    setSortMode(n === 2 ? "diff" : "name");
  }

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

  // "差分順": group permIds by holder-mask. Section order: 共通 (when shown)
  // first, then single-role sections and combination sections by popcount asc
  // then mask asc (A のみ -> B のみ -> ... -> A·B -> ... -> B·C), and finally
  // a synthetic "unheld by anyone" section (mask = -1) at the very end.
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
    if (showCommon) presentMasks.add(full);

    const nonCommonMasks = [...presentMasks]
      .filter((m) => m !== full)
      .sort((a, b) => {
        const pa = popcount(a);
        const pb = popcount(b);
        return pa !== pb ? pa - pb : a - b;
      });
    const orderedMasks = showCommon
      ? [full, ...nonCommonMasks]
      : nonCommonMasks;

    const isSingle = (mask: number) => popcount(mask) === 1;
    const sections: DiffSection[] = orderedMasks.map((mask) => {
      const parts = labelPartsForMask(roleIndexes, ds, mask, t);
      return {
        key: `sec:${mask}`,
        mask,
        parts,
        permIds: (byMask.get(mask) ?? []).sort((a, b) => a - b),
        alwaysShow: mask === full || isSingle(mask),
      };
    });
    if (unheldPermIds.length > 0) {
      sections.push({
        key: "sec:-1",
        mask: -1,
        parts: [{ text: t("compare.unheld"), className: "text-gray-400" }],
        permIds: [...unheldPermIds].sort((a, b) => a - b),
        alwaysShow: false,
      });
    }
    return sections;
  }, [ds, roleIndexes, permIds, masks, unheldPermIds, showCommon, full, t]);

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
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderGroupRows = (g: MatrixGroup, collapseKey: string) => {
    const opened = isOpen(collapseKey);
    return (
      <Fragment key={collapseKey}>
        <tr
          className="cursor-pointer border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:bg-gray-900"
          onClick={() => toggle(collapseKey)}
        >
          <td className="sticky left-0 z-10 w-56 min-w-56 border-r border-gray-200 bg-gray-50/60 px-2 py-1 dark:border-gray-800 dark:bg-gray-900/40">
            <span className="flex items-center gap-1.5 overflow-hidden">
              <span className="flex w-3 shrink-0 text-gray-400">
                {opened ? (
                  <ChevronDown size={13} className="inline-block" />
                ) : (
                  <ChevronRight size={13} className="inline-block" />
                )}
              </span>
              <span className="truncate font-mono font-medium text-gray-700 dark:text-gray-300">
                <MonoName name={g.key} />
                <span className="text-gray-400">.*</span>
              </span>
              <span className="shrink-0 text-[10px] text-gray-400">
                {g.permIds.length}
              </span>
            </span>
          </td>
          {roleIndexes.map((roleIdx, i) => {
            const c = seriesColor(i);
            const held = g.permIds.filter(
              (id) => (masks.get(id) ?? 0) & (1 << i),
            ).length;
            const cls =
              held === g.permIds.length
                ? c.text
                : held === 0
                  ? "text-gray-300 dark:text-gray-700"
                  : "text-gray-500 dark:text-gray-400";
            return (
              <td
                key={roleIdx}
                className="border-l border-gray-100 px-1 py-1 text-center tabular-nums dark:border-gray-800"
              >
                <span
                  className={`inline-flex items-center gap-1 text-xs ${cls}`}
                >
                  <SparkPie ratio={held / g.permIds.length} />
                  {held}/{g.permIds.length}
                </span>
              </td>
            );
          })}
          <td />
        </tr>
        {opened &&
          g.permIds.map((id) => {
            const name = ds.permissions[id];
            const mask = masks.get(id) ?? 0;
            return (
              <tr
                key={id}
                className="border-b border-gray-50 hover:bg-amber-50 dark:border-gray-900 dark:hover:bg-amber-950/30"
              >
                <td className="sticky left-0 z-10 w-56 min-w-56 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                  <button
                    type="button"
                    onClick={() => state.anchorPerm(name)}
                    title={ds.permMeta[id]?.description ?? name}
                    className="block w-full cursor-pointer truncate py-0.5 pr-2 pl-7 text-left font-mono hover:underline"
                  >
                    <span className="text-gray-400 dark:text-gray-500">
                      {permParts(name).group}.
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {permParts(name).verb}
                    </span>
                  </button>
                </td>
                {roleIndexes.map((roleIdx, i) => {
                  const c = seriesColor(i);
                  const has = (mask & (1 << i)) !== 0;
                  return (
                    <td
                      key={roleIdx}
                      className="border-l border-gray-100 text-center dark:border-gray-800"
                    >
                      {has ? (
                        <Check size={16} className={`inline-block ${c.text}`} />
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">
                          −
                        </span>
                      )}
                    </td>
                  );
                })}
                <td />
              </tr>
            );
          })}
      </Fragment>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 px-3 py-1.5 dark:border-gray-800">
        <div className="flex shrink-0 items-center gap-0.5 rounded border border-gray-200 p-0.5 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setSortMode("diff")}
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
            onClick={() => setSortMode("name")}
            className={`whitespace-nowrap rounded px-2 py-0.5 text-sm cursor-pointer ${
              sortMode === "name"
                ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {t("compare.sortName")}
          </button>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showCommon}
            onChange={(e) => setShowCommon(e.target.checked)}
            className="accent-purple-600"
          />
          {t("compare.showCommon", { n: commonCount })}
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showUnheld}
            onChange={(e) => setShowUnheld(e.target.checked)}
            className="accent-purple-600"
          />
          {t("compare.showUnheld")}
        </label>
        <span className="ml-auto text-[10px] text-gray-400">
          {t("compare.groupsAndRows", { groups: groupCount, rows: totalRows })}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {/* fixed layout: the trailing spacer column absorbs the leftover
            width so the role columns hug the permission column instead of
            spreading across the pane */}
        <table
          className="w-full table-fixed border-collapse text-sm"
          style={{ minWidth: `calc(14rem + ${roleIndexes.length} * 5rem)` }}
        >
          <thead>
            <tr className="sticky top-0 z-10 bg-white dark:bg-gray-950">
              <th className="sticky left-0 z-20 w-56 min-w-56 border-r border-b border-gray-200 bg-white px-2 py-1.5 text-left align-bottom dark:border-gray-800 dark:bg-gray-950">
                <span className="text-[10px] font-normal text-gray-400">
                  {t("compare.permissionColumn")}
                </span>
              </th>
              {roleIndexes.map((roleIdx, i) => {
                const role = ds.roles[roleIdx];
                const c = seriesColor(i);
                // break after "roles/<service>." so long names don't blow up
                // the column ("roles/admin" splits into "roles/" + "admin")
                const dot = role.name.indexOf(".");
                const head =
                  dot === -1 ? "roles/" : role.name.slice(0, dot + 1);
                const tail =
                  dot === -1
                    ? shortRoleName(role.name)
                    : role.name.slice(dot + 1);
                return (
                  <th
                    key={roleIdx}
                    className="w-20 border-b border-l border-gray-100 border-b-gray-200 px-1 py-1.5 text-center align-bottom dark:border-gray-800 dark:border-b-gray-800"
                    title={role.name}
                  >
                    <span
                      className={`block truncate font-mono text-[10px] font-normal opacity-70 ${c.text}`}
                    >
                      {head}
                    </span>
                    <span
                      className={`block truncate font-mono text-[11px] font-semibold ${c.text}`}
                    >
                      {tail}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {role.permIds.length}
                    </span>
                  </th>
                );
              })}
              {/* spacer column: absorbs the leftover pane width */}
              <th className="border-b border-gray-200 dark:border-gray-800" />
            </tr>
          </thead>
          <tbody>
            {sortMode === "name"
              ? groups.map((g) => renderGroupRows(g, g.key))
              : diffSections
                  .filter((s) => s.alwaysShow || s.permIds.length > 0)
                  .map((s) => {
                    const sectionOpen = isSectionOpen(s.key);
                    const badges = badgesForPermissions(
                      s.permIds.map((id) => ds.permissions[id]),
                    );
                    const sectionGroups = groupMatrixRows(ds, s.permIds);
                    const isEmpty = s.permIds.length === 0;
                    return (
                      <Fragment key={s.key}>
                        <tr
                          className="cursor-pointer border-y border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                          onClick={() => toggle(s.key)}
                        >
                          <td
                            colSpan={roleIndexes.length + 2}
                            className="sticky left-0 z-10 bg-white px-3 py-1.5 dark:bg-gray-950"
                          >
                            <span className="flex items-center gap-2">
                              <span className="flex w-3.5 shrink-0 text-gray-400">
                                {sectionOpen ? (
                                  <ChevronDown
                                    size={14}
                                    className="inline-block"
                                  />
                                ) : (
                                  <ChevronRight
                                    size={14}
                                    className="inline-block"
                                  />
                                )}
                              </span>
                              <span className="text-sm font-semibold">
                                {s.parts.map((p, idx) => (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: parts order is stable within a section
                                  <span key={idx} className={p.className}>
                                    {p.text}
                                  </span>
                                ))}
                              </span>
                              <span className="text-xs text-gray-400">
                                {s.permIds.length}
                              </span>
                              <span className="ml-auto flex gap-1">
                                {badges.map((b) => (
                                  <BadgeTag key={b.id} badge={b} />
                                ))}
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
                          sectionGroups.map((g) =>
                            renderGroupRows(g, `${s.mask}/${g.key}`),
                          )}
                      </Fragment>
                    );
                  })}
          </tbody>
        </table>
      </div>
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
    <div className="flex h-full flex-col">
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
      <div className="min-h-0 flex-1">
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
