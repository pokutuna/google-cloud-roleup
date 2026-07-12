import { type ReactNode, useMemo, useState } from "react";
import { type Dataset, shortRoleName } from "../lib/data";
import { useT } from "../lib/i18n";
import {
  filterPermIds,
  hasPermFilter,
  matchingPermBits,
  parseQuery,
  permNameMatches,
  stripPermQualifiers,
} from "../lib/search";
import type { ExplorerState } from "../lib/url-state";
import { MAX_COMPARE_ROLES } from "./colors";
import { PermGroupList } from "./PermGroupList";
import { MonoName, PermFilterNotice } from "./primitives";

function MissTeaser({
  ds,
  state,
  term,
}: {
  ds: Dataset;
  state: ExplorerState;
  term: string;
}) {
  const t = useT();
  const { matchCount, roleCount, exact } = useMemo(() => {
    const bits = matchingPermBits(ds, term);
    let matchCount = 0;
    for (let i = 0; i < ds.permissions.length; i++) {
      if (permNameMatches(ds.permissions[i], term)) matchCount++;
    }
    let roleCount = 0;
    for (let i = 0; i < ds.roles.length; i++) {
      for (let w = 0; w < bits.length; w++) {
        if ((ds.roleBits[i][w] & bits[w]) !== 0) {
          roleCount++;
          break;
        }
      }
    }
    const exact =
      matchCount === 1
        ? ds.permissions.find((p) => permNameMatches(p, term))
        : undefined;
    return { matchCount, roleCount, exact };
  }, [ds, term]);

  if (matchCount === 0) {
    return (
      <p className="p-3 text-sm text-gray-500">
        {t("detail.notIncluded", { term })}
      </p>
    );
  }
  return (
    <div className="m-3 rounded border border-rose-300 bg-rose-50 p-3 text-sm dark:border-rose-800 dark:bg-rose-950/40">
      <p className="font-medium text-rose-900 dark:text-rose-200">
        {t("detail.notInThisRole")}
      </p>
      <button
        type="button"
        onClick={() =>
          exact ? state.anchorPerm(exact) : state.setQ(`p:${term} `)
        }
        className="mt-1 text-rose-800 underline dark:text-rose-300 cursor-pointer"
      >
        {t("detail.reverseLookupCount", { term, count: roleCount })}
      </button>
    </div>
  );
}

/** ±n diff badge: "+n" green, "−n" red (U+2212). */
function DiffBadge({ plus, minus }: { plus?: number; minus?: number }) {
  if (plus === undefined && minus === undefined) return null;
  return (
    <span className="flex shrink-0 items-baseline font-mono text-xs">
      <span className="inline-block min-w-[4.5ch] text-right text-green-600 dark:text-green-400">
        {!!plus && `+${plus}`}
      </span>
      <span className="inline-block min-w-[4.5ch] text-right text-red-600 dark:text-red-400">
        {!!minus && `−${minus}`}
      </span>
    </span>
  );
}

function RelatedRoleRow({
  ds,
  state,
  otherIndex,
  plus,
  minus,
}: {
  ds: Dataset;
  state: ExplorerState;
  otherIndex: number;
  plus?: number;
  minus?: number;
}) {
  const t = useT();
  const other = ds.roles[otherIndex];
  const short = shortRoleName(other.name);
  const selectedRoles = state.selection.filter((it) => it.type === "r");
  const capBlocked =
    selectedRoles.length >= MAX_COMPARE_ROLES &&
    !selectedRoles.some((it) => it.name === short);
  return (
    <li className="group flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900">
      <button
        type="button"
        onClick={() => state.select({ type: "r", name: short })}
        className="min-w-0 flex-1 truncate text-left text-gray-700 hover:underline dark:text-gray-300 cursor-pointer"
        title={other.title}
      >
        <MonoName name={other.name} />
      </button>
      <span className="relative flex h-5 shrink-0 items-center">
        <span className="transition-opacity group-hover:opacity-0">
          <DiffBadge plus={plus} minus={minus} />
        </span>
        <button
          type="button"
          disabled={capBlocked}
          onClick={() => state.toggle({ type: "r", name: short })}
          title={
            capBlocked
              ? t("rolelist.maxCompare", { n: MAX_COMPARE_ROLES })
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
}

const COLLAPSE_DEFAULT_LIMIT = 5;

function CollapsibleSection<T>({
  title,
  items,
  renderRow,
  defaultLimit = COLLAPSE_DEFAULT_LIMIT,
}: {
  title: string;
  items: T[];
  renderRow: (item: T) => ReactNode;
  defaultLimit?: number;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, defaultLimit);
  const remaining = items.length - shown.length;

  return (
    <section>
      <h3 className="mb-1.5 border-b border-gray-200 pb-1 text-xs font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200">
        {title}
      </h3>
      <ul>{shown.map(renderRow)}</ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-xs text-gray-400 hover:text-gray-600 hover:underline cursor-pointer dark:hover:text-gray-300"
        >
          {t("detail.showMore", { n: remaining })}
        </button>
      )}
      {remaining === 0 && expanded && items.length > defaultLimit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-xs text-gray-400 hover:text-gray-600 hover:underline cursor-pointer dark:hover:text-gray-300"
        >
          {t("detail.showLess")}
        </button>
      )}
    </section>
  );
}

function RelatedRoles({
  ds,
  state,
  roleIndex,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndex: number;
}) {
  const t = useT();
  const rel = ds.relations[roleIndex];
  const anchor = ds.roles[roleIndex];
  const anchorSize = anchor.permIds.length;

  return (
    <div key={roleIndex} className="flex flex-col gap-4 p-3">
      <p className="text-[10px] text-gray-400">{t("detail.diffHint")}</p>
      {rel.sameService.length > 0 && (
        <section>
          <h3 className="mb-1.5 border-b border-gray-200 pb-1 text-xs font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200">
            {t("detail.sameService")}
          </h3>
          <ul>
            {rel.sameService.map(([j, shared]) => {
              const otherSize = ds.roles[j].permIds.length;
              return (
                <RelatedRoleRow
                  key={ds.roles[j].name}
                  ds={ds}
                  state={state}
                  otherIndex={j}
                  plus={otherSize - shared}
                  minus={anchorSize - shared}
                />
              );
            })}
          </ul>
        </section>
      )}
      {rel.supersets.length > 0 && (
        <CollapsibleSection
          title={t("detail.supersets")}
          items={rel.supersets}
          renderRow={(j) => (
            <RelatedRoleRow
              key={ds.roles[j].name}
              ds={ds}
              state={state}
              otherIndex={j}
              plus={ds.roles[j].permIds.length - anchorSize}
            />
          )}
        />
      )}
      {rel.subsets.length > 0 && (
        <CollapsibleSection
          title={t("detail.subsets")}
          items={rel.subsets}
          renderRow={(j) => (
            <RelatedRoleRow
              key={ds.roles[j].name}
              ds={ds}
              state={state}
              otherIndex={j}
              minus={anchorSize - ds.roles[j].permIds.length}
            />
          )}
        />
      )}
      {rel.similar.length > 0 && (
        <CollapsibleSection
          title={t("detail.similar")}
          items={rel.similar}
          renderRow={([j, , shared]) => {
            const otherSize = ds.roles[j].permIds.length;
            return (
              <RelatedRoleRow
                key={ds.roles[j].name}
                ds={ds}
                state={state}
                otherIndex={j}
                plus={otherSize - shared}
                minus={anchorSize - shared}
              />
            );
          }}
        />
      )}
    </div>
  );
}

/** Single-role detail: permission tree (left) + related roles (right). */
export function DetailPane({
  ds,
  state,
  roleIndex,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndex: number;
}) {
  const t = useT();
  const role = ds.roles[roleIndex];
  const parsed = useMemo(() => parseQuery(state.q), [state.q]);
  const filterActive = hasPermFilter(parsed);
  const filtered = useMemo(
    () => filterPermIds(ds, role.permIds, parsed),
    [ds, role.permIds, parsed],
  );
  const missTerm = parsed.p[0] ?? parsed.s[0];
  const filterTerms = [
    ...parsed.s.map((t) => `s:${t}`),
    ...parsed.p.map((t) => `p:${t}`),
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            <MonoName name={role.name} />
          </h2>
          <span className="text-sm text-gray-500">{role.title}</span>
          {role.stage && role.stage !== "GA" && (
            <span
              className={`rounded px-1 text-xs uppercase ${
                role.stage === "DEPRECATED"
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800"
              }`}
            >
              {role.stage}
            </span>
          )}
          <span className="ml-auto text-sm text-gray-400">
            {role.permIds.length} permissions
          </span>
        </div>
        {role.description && (
          <p className="mt-1 text-sm text-gray-500">{role.description}</p>
        )}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 divide-y divide-gray-200 md:grid-cols-2 md:grid-rows-1 md:divide-x md:divide-y-0 dark:divide-gray-800">
        <div className="flex min-h-0 flex-col">
          <p className="border-b border-gray-100 p-2 text-[10px] text-gray-400 dark:border-gray-800">
            {t("detail.clickToReverseLookup")}
          </p>
          {filterActive && (
            <PermFilterNotice
              terms={filterTerms}
              shown={filtered.length}
              total={role.permIds.length}
              onClear={() => state.setQ(stripPermQualifiers(state.q))}
            />
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 && missTerm ? (
              <MissTeaser ds={ds} state={state} term={missTerm} />
            ) : (
              <PermGroupList
                ds={ds}
                permIds={filtered}
                defaultOpen={filterActive || filtered.length <= 60}
                onSelectPerm={(name) => state.anchorPerm(name)}
              />
            )}
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <h3 className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("detail.relatedRoles")}
            <span className="ml-1 font-normal normal-case text-gray-400">
              {t("detail.relatedRolesHint")}
            </span>
          </h3>
          <RelatedRoles ds={ds} state={state} roleIndex={roleIndex} />
        </div>
      </div>
    </div>
  );
}
