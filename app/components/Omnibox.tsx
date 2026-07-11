import { Command } from "cmdk";
import { useMemo, useRef, useState } from "react";
import { type Dataset, serviceDisplayName, shortRoleName } from "../lib/data";
import { suggest } from "../lib/search";
import type { ExplorerState } from "../lib/url-state";
import { ENTITY } from "./colors";

/** replace the token being typed with a completed qualifier */
function replaceLastToken(q: string, replacement: string): string {
  const tokens = q.trim().split(/\s+/);
  tokens.pop();
  return [...tokens, replacement].join(" ").trimStart();
}

const GROUP_HEADING =
  "px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400";
const ITEM =
  "flex cursor-pointer items-baseline gap-2 rounded px-2 py-1 text-sm data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-gray-800";

export function Omnibox({ ds, state }: { ds: Dataset; state: ExplorerState }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The input owns its text locally so keystrokes render synchronously;
  // state.setQ routes through a router navigation (startTransition), which
  // would otherwise lag the controlled value. External q changes (example
  // clicks, filter-notice clear, back button) sync back into the input.
  const [text, setText] = useState(state.q);
  const lastQ = useRef(state.q);
  if (lastQ.current !== state.q) {
    lastQ.current = state.q;
    if (text !== state.q) setText(state.q);
  }
  const onValueChange = (value: string) => {
    setText(value);
    lastQ.current = value;
    state.setQ(value);
  };

  const sugg = useMemo(
    () =>
      text.trim()
        ? suggest(ds, text, 6, {
            includeServiceAgents: state.showServiceAgents,
          })
        : null,
    [ds, text, state.showServiceAgents],
  );
  const open =
    focused &&
    sugg !== null &&
    sugg.services.length + sugg.roleIndexes.length + sugg.permIds.length > 0;

  return (
    <Command
      shouldFilter={false}
      className="relative flex-1"
      label="ロール・パーミッション検索"
    >
      <Command.Input
        ref={inputRef}
        value={text}
        onValueChange={onValueChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="検索: s:bigquery p:tables.getData owner ... (s:=サービス r:=ロール p:=パーミッション)"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-purple-900"
      />
      <Command.List
        hidden={!open}
        className="absolute z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
      >
        {sugg && sugg.services.length > 0 && (
          <Command.Group
            heading={<span className={GROUP_HEADING}>サービス</span>}
          >
            {sugg.services.map((prefix) => (
              <Command.Item
                key={`s:${prefix}`}
                value={`s:${prefix}`}
                onSelect={() => {
                  onValueChange(`${replaceLastToken(text, `s:${prefix}`)} `);
                  inputRef.current?.focus();
                }}
                className={ITEM}
              >
                <span className={`font-mono text-xs ${ENTITY.s.text}`}>s:</span>
                <span className="font-mono">{prefix}</span>
                <span className="truncate text-xs text-gray-400">
                  {serviceDisplayName(ds, prefix)}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {sugg && sugg.roleIndexes.length > 0 && (
          <Command.Group
            heading={<span className={GROUP_HEADING}>ロール</span>}
          >
            {sugg.roleIndexes.map((idx) => {
              const role = ds.roles[idx];
              const short = shortRoleName(role.name);
              return (
                <Command.Item
                  key={`r:${short}`}
                  value={`r:${short}`}
                  onSelect={() => state.select({ type: "r", name: short })}
                  className={ITEM}
                >
                  <span className={`font-mono text-xs ${ENTITY.r.text}`}>
                    r:
                  </span>
                  <span className="font-mono">{short}</span>
                  <span className="truncate text-xs text-gray-400">
                    {role.title} · {role.permIds.length} perms
                  </span>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}
        {sugg && sugg.permIds.length > 0 && (
          <Command.Group
            heading={<span className={GROUP_HEADING}>パーミッション</span>}
          >
            {sugg.permIds.map((id) => (
              <Command.Item
                key={`p:${ds.permissions[id]}`}
                value={`p:${ds.permissions[id]}`}
                onSelect={() => state.anchorPerm(ds.permissions[id])}
                className={ITEM}
              >
                <span className={`font-mono text-xs ${ENTITY.p.text}`}>p:</span>
                <span className="truncate font-mono">{ds.permissions[id]}</span>
                {ds.permMeta[id]?.title && (
                  <span className="truncate text-xs text-gray-400">
                    {ds.permMeta[id].title}
                  </span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command>
  );
}
