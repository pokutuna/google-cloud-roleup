import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../lib/data";
import { usePinnedServices } from "../lib/pinned";
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

function SettingsMenu() {
  const { reset, isDefault } = usePinnedServices();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="設定"
        aria-label="設定"
        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <Settings size={16} />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-30 mt-1 w-56 rounded border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            disabled={isDefault}
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className={`block w-full px-3 py-1.5 text-left ${
              isDefault
                ? "cursor-default text-gray-400 dark:text-gray-600"
                : "cursor-pointer text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            サービスのピン留めをリセット
          </button>
        </div>
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
        <SettingsMenu />
      </div>
      <Omnibox ds={ds} state={state} />
      <SelectionTray state={state} />
    </header>
  );
}
