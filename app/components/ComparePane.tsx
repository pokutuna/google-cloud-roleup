import {
  Check,
  ChevronDown,
  ChevronRight,
  Columns2,
  Table as TableIcon,
} from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";
import { badgesForPermissions } from "../lib/badges";
import { type Dataset, permParts, shortRoleName } from "../lib/data";
import type { ExplorerState } from "../lib/url-state";
import { COMMON_SECTION, seriesColor } from "./colors";
import { PermGroupList } from "./PermGroupList";
import { BadgeTag, MonoName } from "./primitives";

interface Section {
  key: string;
  label: string;
  permIds: number[];
  textClass: string;
  barClass: string;
}

/**
 * Membership-driven sections: permId -> bitmask of which roles (by position)
 * hold it. Reused by both the diff view (2 roles) and the matrix view
 * (grouping / common-row detection for 3+ roles).
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

function computeDiffSections(ds: Dataset, roleIndexes: number[]): Section[] {
  const masks = computeMasks(ds, roleIndexes);
  const byMask = new Map<number, number[]>();
  for (const [id, mask] of masks) {
    const list = byMask.get(mask);
    if (list) list.push(id);
    else byMask.set(mask, [id]);
  }
  const full = 0b11;
  const name = (i: number) => shortRoleName(ds.roles[roleIndexes[i]].name);

  const onlySections = roleIndexes.map((_, i) => {
    const c = seriesColor(i);
    return {
      key: `only-${i}`,
      label: `${name(i)} のみ`,
      permIds: (byMask.get(1 << i) ?? []).sort((a, b) => a - b),
      textClass: c.text,
      barClass: c.bg,
    };
  });
  const common: Section = {
    key: "common",
    label: "共通",
    permIds: (byMask.get(full) ?? []).sort((a, b) => a - b),
    textClass: COMMON_SECTION.text,
    barClass: COMMON_SECTION.bg,
  };

  return [onlySections[0], common, onlySections[1]];
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

function MatrixView({
  ds,
  state,
  roleIndexes,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndexes: number[];
}) {
  const n = roleIndexes.length;
  const masks = useMemo(() => computeMasks(ds, roleIndexes), [ds, roleIndexes]);
  const full = (1 << n) - 1;
  const [showCommon, setShowCommon] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const commonCount = useMemo(() => {
    let c = 0;
    for (const mask of masks.values()) if (mask === full) c++;
    return c;
  }, [masks, full]);

  const permIds = useMemo(() => {
    const ids = [...masks.keys()];
    if (showCommon) return ids.sort((a, b) => a - b);
    return ids.filter((id) => masks.get(id) !== full).sort((a, b) => a - b);
  }, [masks, full, showCommon]);

  const groups = useMemo(() => groupMatrixRows(ds, permIds), [ds, permIds]);

  const totalRows = permIds.length;
  const groupCount = groups.length;
  // default: expand groups when the overall row count is small enough to scan
  const defaultOpen = totalRows <= 60;
  const isOpen = (key: string) =>
    collapsed.has(key) ? !defaultOpen : defaultOpen;
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 px-3 py-1.5 dark:border-gray-800">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showCommon}
            onChange={(e) => setShowCommon(e.target.checked)}
            className="accent-purple-600"
          />
          共通も表示 ({commonCount})
        </label>
        <span className="ml-auto text-[10px] text-gray-400">
          {groupCount} グループ / {totalRows} 権限
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-white dark:bg-gray-950">
              <th className="sticky left-0 z-20 w-56 min-w-56 border-r border-b border-gray-200 bg-white px-2 py-1.5 text-left align-bottom dark:border-gray-800 dark:bg-gray-950">
                <span className="text-[10px] font-normal text-gray-400">
                  権限
                </span>
              </th>
              {roleIndexes.map((roleIdx, i) => {
                const role = ds.roles[roleIdx];
                const c = seriesColor(i);
                return (
                  <th
                    key={roleIdx}
                    className="w-20 border-b border-gray-200 px-1 py-1.5 text-center align-bottom dark:border-gray-800"
                    title={shortRoleName(role.name)}
                  >
                    <MonoName
                      name={shortRoleName(role.name)}
                      className={`block truncate text-[11px] font-semibold ${c.text}`}
                    />
                    <span className="text-[10px] text-gray-400">
                      {role.permIds.length}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const opened = isOpen(g.key);
              return (
                <Fragment key={g.key}>
                  <tr
                    className="cursor-pointer border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:bg-gray-900"
                    onClick={() => toggle(g.key)}
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
                        <MonoName
                          name={g.key}
                          className="truncate font-medium text-gray-700 dark:text-gray-300"
                        />
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
                          className="px-1 py-1 text-center tabular-nums"
                        >
                          <span className={`text-[10px] ${cls}`}>
                            {held}/{g.permIds.length}
                          </span>
                        </td>
                      );
                    })}
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
                              onClick={() => state.select({ type: "p", name })}
                              title={ds.permMeta[id]?.description ?? name}
                              className="block w-full cursor-pointer truncate py-0.5 pr-2 pl-7 text-left font-mono text-gray-700 hover:underline dark:text-gray-300"
                            >
                              {permParts(name).verb}
                            </button>
                          </td>
                          {roleIndexes.map((roleIdx, i) => {
                            const c = seriesColor(i);
                            const has = (mask & (1 << i)) !== 0;
                            return (
                              <td key={roleIdx} className="text-center">
                                {has ? (
                                  <Check
                                    size={14}
                                    className={`inline-block ${c.text}`}
                                  />
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-700">
                                    −
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiffView({
  ds,
  state,
  sections,
  sectionRefs,
  forcedOpen,
  jumpTo,
}: {
  ds: Dataset;
  state: ExplorerState;
  sections: Section[];
  sectionRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  forcedOpen: Set<string>;
  jumpTo: (key: string) => void;
}) {
  const [a, common, b] = sections;
  const columns = [a, b];

  return (
    <div className="flex h-full flex-col">
      <p className="border-b border-gray-100 px-3 py-1 text-[10px] text-gray-400 dark:border-gray-900">
        左のロールから右のロールへ乗り換えると、左カラムを失い右カラムを得ます
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800">
          {columns.map((s, i) => {
            const badges = badgesForPermissions(
              s.permIds.map((id) => ds.permissions[id]),
            );
            const c = seriesColor(i);
            return (
              <div key={s.key}>
                <header
                  className={`sticky top-0 z-10 flex items-center gap-2 px-3 py-2 ${c.bgSoft}`}
                >
                  <h3 className={`text-sm font-semibold ${s.textClass}`}>
                    {s.label} ({s.permIds.length})
                  </h3>
                  <span className="ml-auto flex gap-1">
                    {badges.map((b) => (
                      <BadgeTag key={b.id} badge={b} />
                    ))}
                  </span>
                </header>
                <div className="px-1">
                  {s.permIds.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">なし</p>
                  ) : (
                    <PermGroupList
                      ds={ds}
                      permIds={s.permIds}
                      defaultOpen={s.permIds.length <= 60}
                      onSelectPerm={(name) => state.select({ type: "p", name })}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <section
          ref={(el) => {
            if (el) sectionRefs.current.set(common.key, el);
          }}
          className="m-3 rounded border-l-4 border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/40"
        >
          <button
            type="button"
            onClick={() => jumpTo(common.key)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left cursor-pointer"
          >
            <span className="flex w-3 text-gray-400">
              {forcedOpen.has(common.key) ? (
                <ChevronDown size={14} className="inline-block" />
              ) : (
                <ChevronRight size={14} className="inline-block" />
              )}
            </span>
            <h3 className={`text-sm font-semibold ${common.textClass}`}>
              {common.label} ({common.permIds.length})
            </h3>
          </button>
          {forcedOpen.has(common.key) &&
            (common.permIds.length === 0 ? (
              <p className="px-3 pb-2 text-xs text-gray-400">なし</p>
            ) : (
              <PermGroupList
                ds={ds}
                permIds={common.permIds}
                defaultOpen={common.permIds.length <= 60}
                onSelectPerm={(name) => state.select({ type: "p", name })}
              />
            ))}
        </section>
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
  const isTwo = roleIndexes.length === 2;
  const [view, setView] = useState<"diff" | "matrix">("diff");
  const effectiveView = isTwo ? view : "matrix";

  const sections = useMemo(
    () => (isTwo ? computeDiffSections(ds, roleIndexes) : []),
    [ds, roleIndexes, isTwo],
  );
  const total = sections.reduce((sum, s) => sum + s.permIds.length, 0);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const [forcedOpen, setForcedOpen] = useState<Set<string>>(new Set());

  const jumpTo = (key: string) => {
    setForcedOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    sectionRefs.current.get(key)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            比較: {roleIndexes.length} ロール
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
                  <MonoName name={shortRoleName(role.name)} />
                  <span className="opacity-70">{role.permIds.length}</span>
                </span>
              );
            })}
          </div>
          {isTwo && (
            <div className="ml-auto flex items-center gap-0.5 rounded border border-gray-200 p-0.5 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setView("diff")}
                title="diff ビュー"
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-xs cursor-pointer ${
                  view === "diff"
                    ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <Columns2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setView("matrix")}
                title="マトリクスビュー"
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-xs cursor-pointer ${
                  view === "matrix"
                    ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <TableIcon size={14} />
              </button>
            </div>
          )}
        </div>
        {effectiveView === "diff" && (
          <>
            <div className="mt-2 flex h-4 w-full overflow-hidden rounded">
              {sections
                .filter((s) => s.permIds.length > 0)
                .map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => jumpTo(s.key)}
                    title={`${s.label}: ${s.permIds.length}`}
                    className={`${s.barClass} cursor-pointer transition-opacity hover:opacity-80`}
                    style={{ width: `${(s.permIds.length / total) * 100}%` }}
                  />
                ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {sections.map((s) => (
                <span key={s.key} className={s.textClass}>
                  {s.label}: {s.permIds.length}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {effectiveView === "diff" ? (
          <DiffView
            ds={ds}
            state={state}
            sections={sections}
            sectionRefs={sectionRefs}
            forcedOpen={forcedOpen}
            jumpTo={jumpTo}
          />
        ) : (
          <MatrixView ds={ds} state={state} roleIndexes={roleIndexes} />
        )}
      </div>
    </div>
  );
}
