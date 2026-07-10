import { useMemo, useState } from "react";
import { type Dataset, permParts, shortRoleName } from "../lib/data";
import { matchingPermBits, parseQuery } from "../lib/search";
import type { ExplorerState } from "../lib/url-state";
import { PermGroupList } from "./PermGroupList";
import { MonoName } from "./primitives";

function permMatchesFilter(
  permName: string,
  terms: { s: string[]; texts: string[] },
): boolean {
  const lower = permName.toLowerCase();
  const service = permParts(permName).service.toLowerCase();
  return (
    terms.s.every((t) => service.includes(t)) &&
    terms.texts.every((t) => lower.includes(t))
  );
}

/** In-pane filter (§4.4): same syntax as the omnibox, different target. */
function usePermFilter(ds: Dataset, permIds: number[]) {
  const [filter, setFilter] = useState("");
  const { filtered, terms } = useMemo(() => {
    const parsed = parseQuery(filter);
    const terms = { s: parsed.s, texts: [...parsed.p, ...parsed.free] };
    const filtered =
      terms.s.length === 0 && terms.texts.length === 0
        ? permIds
        : permIds.filter((id) => permMatchesFilter(ds.permissions[id], terms));
    return { filtered, terms };
  }, [ds, permIds, filter]);
  return { filter, setFilter, filtered, terms };
}

function MissTeaser({
  ds,
  state,
  term,
}: {
  ds: Dataset;
  state: ExplorerState;
  term: string;
}) {
  const { matchCount, roleCount, exact } = useMemo(() => {
    const bits = matchingPermBits(ds, term);
    let matchCount = 0;
    for (let i = 0; i < ds.permissions.length; i++) {
      if (ds.permissions[i].toLowerCase().includes(term)) matchCount++;
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
        ? ds.permissions.find((p) => p.toLowerCase().includes(term))
        : undefined;
    return { matchCount, roleCount, exact };
  }, [ds, term]);

  if (matchCount === 0) {
    return (
      <p className="p-3 text-sm text-gray-500">
        「{term}」に一致するパーミッションはありません。
      </p>
    );
  }
  return (
    <div className="m-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
      <p className="font-medium text-amber-900 dark:text-amber-200">
        このロールには含まれません
      </p>
      <button
        type="button"
        onClick={() =>
          exact
            ? state.select({ type: "p", name: exact })
            : state.setQ(`p:${term} `)
        }
        className="mt-1 text-amber-800 underline dark:text-amber-300 cursor-pointer"
      >
        「{term}」を含むロール {roleCount} 件を逆引きする →
      </button>
    </div>
  );
}

/** ±n diff badge: "+n" green, "−n" red (U+2212), plain gray count for complements. */
function DiffBadge({ plus, minus }: { plus?: number; minus?: number }) {
  if (plus === undefined && minus === undefined) return null;
  return (
    <span className="flex shrink-0 items-baseline gap-1 font-mono text-xs">
      {!!plus && (
        <span className="text-green-600 dark:text-green-400">+{plus}</span>
      )}
      {!!minus && (
        <span className="text-red-600 dark:text-red-400">
          {"−"}
          {minus}
        </span>
      )}
    </span>
  );
}

function RelatedRoleRow({
  ds,
  state,
  otherIndex,
  plus,
  minus,
  plainCount,
}: {
  ds: Dataset;
  state: ExplorerState;
  otherIndex: number;
  plus?: number;
  minus?: number;
  plainCount?: number;
}) {
  const other = ds.roles[otherIndex];
  const short = shortRoleName(other.name);
  return (
    <li className="group flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900">
      <button
        type="button"
        onClick={() => state.select({ type: "r", name: short })}
        className="min-w-0 flex-1 truncate text-left text-gray-700 hover:underline dark:text-gray-300 cursor-pointer"
        title={other.title}
      >
        <MonoName name={short} />
      </button>
      {plainCount !== undefined ? (
        <span className="shrink-0 font-mono text-xs text-gray-400">
          {plainCount}
        </span>
      ) : (
        <DiffBadge plus={plus} minus={minus} />
      )}
      <button
        type="button"
        onClick={() => state.toggle({ type: "r", name: short })}
        className="shrink-0 rounded border border-gray-300 px-1.5 text-xs text-gray-500 opacity-0 transition-opacity hover:border-purple-400 hover:text-purple-600 group-hover:opacity-100 focus-visible:opacity-100 dark:border-gray-700 dark:hover:text-purple-300 cursor-pointer"
      >
        +比較
      </button>
    </li>
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
  const rel = ds.relations[roleIndex];
  const anchor = ds.roles[roleIndex];
  const anchorSize = anchor.permIds.length;

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-[10px] text-gray-400">
        +増える / −減る: このロールから乗り換えた場合のパーミッション数の増減
      </p>
      {rel.supersets.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            このロールを完全に含むロール
          </h3>
          <ul>
            {rel.supersets.map((j) => (
              <RelatedRoleRow
                key={ds.roles[j].name}
                ds={ds}
                state={state}
                otherIndex={j}
                plus={ds.roles[j].permIds.length - anchorSize}
              />
            ))}
          </ul>
        </section>
      )}
      {rel.subsets.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            このロールに完全に含まれるロール
          </h3>
          <ul>
            {rel.subsets.map((j) => (
              <RelatedRoleRow
                key={ds.roles[j].name}
                ds={ds}
                state={state}
                otherIndex={j}
                minus={anchorSize - ds.roles[j].permIds.length}
              />
            ))}
          </ul>
        </section>
      )}
      {rel.similar.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            近いロール
          </h3>
          <ul>
            {rel.similar.map(([j, , shared]) => {
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
      {rel.complements.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            重複しないロール (同サービス)
          </h3>
          <ul>
            {rel.complements.map((j) => (
              <RelatedRoleRow
                key={ds.roles[j].name}
                ds={ds}
                state={state}
                otherIndex={j}
                plainCount={ds.roles[j].permIds.length}
              />
            ))}
          </ul>
        </section>
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
  const role = ds.roles[roleIndex];
  const { filter, setFilter, filtered, terms } = usePermFilter(
    ds,
    role.permIds,
  );
  const missTerm = terms.texts[0] ?? terms.s[0];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-baseline gap-2">
          <h2 className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
            {shortRoleName(role.name)}
          </h2>
          <span className="text-sm text-gray-500">{role.title}</span>
          {role.stage && role.stage !== "GA" && (
            <span className="rounded bg-gray-100 px-1 text-xs uppercase text-gray-500 dark:bg-gray-800">
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
      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800">
        <div className="flex min-h-0 flex-col">
          <div className="border-b border-gray-100 p-2 dark:border-gray-800">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="このロール内を絞り込む (s:bigquery, getData ...)"
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-[10px] text-gray-400">
              パーミッションをクリックすると、それを含むロールを逆引きします
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 && missTerm ? (
              <MissTeaser ds={ds} state={state} term={missTerm} />
            ) : (
              <PermGroupList
                ds={ds}
                permIds={filtered}
                defaultOpen={filter !== "" || filtered.length <= 60}
                onSelectPerm={(name) => state.select({ type: "p", name })}
              />
            )}
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <h3 className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            関連ロール
            <span className="ml-1 font-normal normal-case text-gray-400">
              クリックで移動 / +比較 で差分表示
            </span>
          </h3>
          <RelatedRoles ds={ds} state={state} roleIndex={roleIndex} />
        </div>
      </div>
    </div>
  );
}
