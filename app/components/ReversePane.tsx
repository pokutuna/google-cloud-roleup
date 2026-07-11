import { ArrowDownWideNarrow, ArrowUpNarrowWide, X } from "lucide-react";
import { useMemo, useState } from "react";
import { badgesForPermission } from "../lib/badges";
import {
  type Dataset,
  isServiceAgent,
  permParts,
  serviceDisplayName,
  shortRoleName,
} from "../lib/data";
import { useT } from "../lib/i18n";
import { rolesWithPermission } from "../lib/search";
import type { ExplorerState } from "../lib/url-state";
import { MAX_COMPARE_ROLES } from "./colors";
import { BadgeTag, MonoName, StageTag } from "./primitives";

type SortKey = "count-asc" | "count-desc" | "name";

function sortRoleIdxs(ds: Dataset, idxs: number[], sort: SortKey): number[] {
  const sorted = [...idxs];
  if (sort === "name") {
    sorted.sort((a, b) =>
      shortRoleName(ds.roles[a].name).localeCompare(
        shortRoleName(ds.roles[b].name),
      ),
    );
  } else if (sort === "count-desc") {
    sorted.sort(
      (a, b) => ds.roles[b].permIds.length - ds.roles[a].permIds.length,
    );
  } else {
    sorted.sort(
      (a, b) => ds.roles[a].permIds.length - ds.roles[b].permIds.length,
    );
  }
  return sorted;
}

function SortToggle({
  sort,
  setSort,
}: {
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  const t = useT();
  const countActive = sort === "count-asc" || sort === "count-desc";
  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        type="button"
        onClick={() =>
          setSort(sort === "count-asc" ? "count-desc" : "count-asc")
        }
        className={`flex items-center gap-0.5 rounded px-1 py-0.5 cursor-pointer ${
          countActive
            ? "font-medium text-gray-700 dark:text-gray-200"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
      >
        {t("reverse.sortByCount")}
        {countActive &&
          (sort === "count-asc" ? (
            <ArrowUpNarrowWide size={12} className="inline-block" />
          ) : (
            <ArrowDownWideNarrow size={12} className="inline-block" />
          ))}
      </button>
      <button
        type="button"
        onClick={() => setSort("name")}
        className={`rounded px-1 py-0.5 cursor-pointer ${
          sort === "name"
            ? "font-medium text-gray-700 dark:text-gray-200"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
      >
        {t("reverse.sortByName")}
      </button>
    </div>
  );
}

/**
 * Reverse lookup (§4.8): which roles contain this permission, sorted by
 * total permission count ascending (closest to least privilege first).
 */
export function ReversePane({
  ds,
  state,
  permId,
}: {
  ds: Dataset;
  state: ExplorerState;
  permId: number;
}) {
  const t = useT();
  const name = ds.permissions[permId];
  const meta = ds.permMeta[permId];
  const parts = permParts(name);
  const badges = badgesForPermission(name);
  const [sort, setSort] = useState<SortKey>("count-asc");

  const hasRoleSelected = state.selection.some((it) => it.type === "r");

  const roleIdxs = useMemo(() => rolesWithPermission(ds, permId), [ds, permId]);
  const neighbors = useMemo(() => {
    const ids: number[] = [];
    for (let i = 0; i < ds.permissions.length; i++) {
      if (i !== permId && permParts(ds.permissions[i]).group === parts.group) {
        ids.push(i);
      }
    }
    return ids;
  }, [ds, permId, parts.group]);

  const visibleIdxs = state.showServiceAgents
    ? roleIdxs
    : roleIdxs.filter((i) => !isServiceAgent(ds.roles[i]));
  const hiddenServiceAgentCount = roleIdxs.length - visibleIdxs.length;

  const basics = sortRoleIdxs(
    ds,
    visibleIdxs.filter((i) => ds.roles[i].kind === "basic"),
    sort,
  );
  const predefined = sortRoleIdxs(
    ds,
    visibleIdxs.filter((i) => ds.roles[i].kind === "predefined"),
    sort,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="font-mono text-lg font-bold text-amber-700 dark:text-amber-300">
            {name}
          </h2>
          {badges.map((b) => (
            <BadgeTag key={b.id} badge={b} />
          ))}
          <StageTag stage={meta?.stage} />
          <button
            type="button"
            onClick={() => state.remove({ type: "p", name })}
            title={
              hasRoleSelected
                ? t("reverse.closeBackToRole")
                : t("reverse.close")
            }
            aria-label={
              hasRoleSelected
                ? t("reverse.closeBackToRole")
                : t("reverse.close")
            }
            className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X size={16} className="inline-block" />
          </button>
        </div>
        {(meta?.title || meta?.description) && (
          <p className="mt-1 text-sm text-gray-500">
            {meta.title}
            {meta.title && meta.description && " — "}
            {meta.description}
          </p>
        )}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800">
        <div className="min-h-0 overflow-y-auto p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("reverse.service")}
          </h3>
          <button
            type="button"
            onClick={() => state.setQ(`s:${parts.service} `)}
            className="mt-1 text-sm text-teal-700 hover:underline dark:text-teal-300 cursor-pointer"
          >
            {serviceDisplayName(ds, parts.service)}{" "}
            <span className="font-mono text-xs">({parts.service})</span>
          </button>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("reverse.sameResourcePerms", { group: parts.group })}
          </h3>
          <ul className="mt-1">
            {neighbors.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => state.anchorPerm(ds.permissions[id])}
                  className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                >
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {permParts(ds.permissions[id]).verb}
                  </span>
                  {ds.permMeta[id]?.title && (
                    <span className="truncate text-xs text-gray-400">
                      {ds.permMeta[id].title}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-h-0 overflow-y-auto p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t("reverse.rolesWithPermission", { n: visibleIdxs.length })}
            </h3>
            <SortToggle sort={sort} setSort={setSort} />
          </div>
          {hiddenServiceAgentCount > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {t("reverse.hiddenServiceAgents", {
                n: hiddenServiceAgentCount,
              })}
            </p>
          )}
          {[
            [t("reverse.predefinedRoles"), predefined],
            [t("reverse.basicRoles"), basics],
          ].map(([label, idxs]) =>
            (idxs as number[]).length === 0 ? null : (
              <div key={label as string} className="mt-2">
                <h4 className="text-xs font-medium text-gray-500">
                  {label as string}
                </h4>
                <ul className="mt-1">
                  {(idxs as number[]).map((i) => {
                    const role = ds.roles[i];
                    const short = shortRoleName(role.name);
                    const selectedRoles = state.selection.filter(
                      (it) => it.type === "r",
                    );
                    const capBlocked =
                      selectedRoles.length >= MAX_COMPARE_ROLES &&
                      !selectedRoles.some((it) => it.name === short);
                    return (
                      <li
                        key={role.name}
                        className="group flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            state.select({ type: "r", name: short })
                          }
                          className="min-w-0 flex-1 truncate text-left text-purple-700 hover:underline dark:text-purple-300 cursor-pointer"
                          title={role.title}
                        >
                          <MonoName name={short} />
                        </button>
                        <span className="relative flex h-5 shrink-0 items-center">
                          <span className="text-xs text-gray-400 transition-opacity group-hover:opacity-0">
                            {role.permIds.length}
                          </span>
                          <button
                            type="button"
                            disabled={capBlocked}
                            onClick={() =>
                              state.toggle({ type: "r", name: short })
                            }
                            title={
                              capBlocked
                                ? t("rolelist.maxCompare", {
                                    n: MAX_COMPARE_ROLES,
                                  })
                                : undefined
                            }
                            className={`absolute inset-y-0 right-0 flex items-center whitespace-nowrap rounded border border-gray-300 bg-white px-1.5 text-xs text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 dark:border-gray-700 dark:bg-gray-950 ${
                              capBlocked
                                ? "opacity-40 group-hover:opacity-40"
                                : "hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-300 cursor-pointer"
                            }`}
                          >
                            {t("detail.addCompare")}
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
