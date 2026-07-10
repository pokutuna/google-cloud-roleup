import type { Dataset } from "../lib/data";
import type { ExplorerState } from "../lib/url-state";
import { Omnibox } from "./Omnibox";
import { EntityChip } from "./primitives";

/**
 * Legend line doubling as a tutorial (§4.1-6): each chip is clickable and
 * writes its qualifier into the search box.
 */
function Legend({ state }: { state: ExplorerState }) {
  const append = (qualifier: string) =>
    state.setQ(state.q ? `${state.q.trimEnd()} ${qualifier}` : qualifier);
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <EntityChip kind="s" label="サービス" onClick={() => append("s:")} />
      の下に
      <EntityChip kind="r" label="ロール" onClick={() => append("r:")} />
      があり、その中身は
      <EntityChip
        kind="p"
        label="パーミッション"
        onClick={() => append("p:")}
      />
      の集合です。チップをクリックすると検索構文が入力されます。
    </p>
  );
}

function SelectionTray({ state }: { state: ExplorerState }) {
  if (state.selection.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {state.selection.map((item) => (
        <EntityChip
          key={`${item.type}:${item.name}`}
          kind={item.type}
          label={item.name}
          onRemove={() => state.remove(item)}
        />
      ))}
      {state.selection.length > 1 && (
        <button
          type="button"
          onClick={state.clear}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
        >
          すべて解除
        </button>
      )}
    </div>
  );
}

export function HeaderBar({
  ds,
  state,
}: {
  ds: Dataset;
  state: ExplorerState;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <h1 className="shrink-0 text-base font-bold text-gray-900 dark:text-gray-100">
          Google Cloud RoleUp
        </h1>
        <Legend state={state} />
        <span className="ml-auto shrink-0 text-[10px] text-gray-400">
          data: {ds.generatedAt} · {ds.roles.length} roles ·{" "}
          {ds.permissions.length} permissions
        </span>
      </div>
      <Omnibox ds={ds} state={state} />
      <SelectionTray state={state} />
    </header>
  );
}
