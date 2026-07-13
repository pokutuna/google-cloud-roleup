import { useEffect, useMemo, useRef, useState } from "react";
import { type Dataset, serviceDisplayName, shortRoleName } from "../lib/data";
import { useT } from "../lib/i18n";
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
  "flex w-full cursor-pointer items-baseline gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-50 data-[selected=true]:bg-gray-100 dark:hover:bg-gray-800/50 dark:data-[selected=true]:bg-gray-800";

interface Suggestion {
  key: string;
  onSelect: () => void;
  render: React.ReactNode;
}

export function Omnibox({ ds, state }: { ds: Dataset; state: ExplorerState }) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // The input owns its text locally so every keystroke renders synchronously
  // with browser-default editing behavior; state.setQ routes through a router
  // navigation that re-renders the whole app, so the query is only committed
  // at boundaries: a completed token (space), Enter, leaving the field, or
  // picking a suggestion. External q changes (example clicks, filter-notice
  // clear, back button) sync back into the input.
  const [text, setText] = useState(() => state.q);
  const lastQ = useRef(state.q);
  if (lastQ.current !== state.q) {
    lastQ.current = state.q;
    if (text !== state.q) setText(state.q);
  }
  const commit = (value: string) => {
    if (lastQ.current === value) return;
    lastQ.current = value;
    state.setQ(value);
  };

  // The suggestion list shows while focus is anywhere inside the component
  // (input or the list's option buttons), unless dismissed with Escape.
  const [focusWithin, setFocusWithin] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Keyboard highlight; -1 means nothing highlighted, so Enter applies the
  // query as typed instead of selecting a suggestion.
  const [highlight, setHighlight] = useState(-1);

  // While an IME composition is active, onChange fires for every intermediate
  // conversion candidate; hold off any commit until the composition settles.
  const composing = useRef(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    setDismissed(false);
    setHighlight(-1);
    if (composing.current) return;
    // token boundary: a typed space commits the tokens completed so far;
    // clearing the field commits immediately so the list un-filters
    const inserted = (e.nativeEvent as InputEvent).data;
    if (inserted === " " || value.trim() === "") commit(value);
  };

  // suggest() scans every role and permission, so recomputing it on each
  // keystroke is the expensive part. Debounce the term it runs on rather
  // than the raw text.
  const [suggestText, setSuggestText] = useState(text);
  useEffect(() => {
    const timer = window.setTimeout(() => setSuggestText(text), 150);
    return () => window.clearTimeout(timer);
  }, [text]);
  const sugg = useMemo(
    () =>
      suggestText.trim()
        ? suggest(ds, suggestText, 6, {
            includeServiceAgents: state.showServiceAgents,
          })
        : null,
    [ds, suggestText, state.showServiceAgents],
  );

  const groups: { heading: string; items: Suggestion[] }[] = [];
  if (sugg) {
    if (sugg.services.length > 0) {
      groups.push({
        heading: t("omnibox.groupService"),
        items: sugg.services.map((prefix) => ({
          key: `s:${prefix}`,
          onSelect: () => {
            const value = `${replaceLastToken(text, `s:${prefix}`)} `;
            setText(value);
            commit(value);
            inputRef.current?.focus();
          },
          render: (
            <>
              <span className={`font-mono text-xs ${ENTITY.s.text}`}>s:</span>
              <span className="font-mono">{prefix}</span>
              <span className="truncate text-xs text-gray-400">
                {serviceDisplayName(ds, prefix)}
              </span>
            </>
          ),
        })),
      });
    }
    if (sugg.roleIndexes.length > 0) {
      groups.push({
        heading: t("omnibox.groupRole"),
        items: sugg.roleIndexes.map((idx) => {
          const role = ds.roles[idx];
          const short = shortRoleName(role.name);
          return {
            key: `r:${short}`,
            onSelect: () => {
              state.select({ type: "r", name: short });
              setDismissed(true);
            },
            render: (
              <>
                <span className={`font-mono text-xs ${ENTITY.r.text}`}>r:</span>
                <span className="font-mono">{short}</span>
                <span className="truncate text-xs text-gray-400">
                  {role.title} · {role.permIds.length} perms
                </span>
              </>
            ),
          };
        }),
      });
    }
    if (sugg.permIds.length > 0) {
      groups.push({
        heading: t("omnibox.groupPermission"),
        items: sugg.permIds.map((id) => ({
          key: `p:${ds.permissions[id]}`,
          onSelect: () => {
            state.anchorPerm(ds.permissions[id]);
            setDismissed(true);
          },
          render: (
            <>
              <span className={`font-mono text-xs ${ENTITY.p.text}`}>p:</span>
              <span className="truncate font-mono">{ds.permissions[id]}</span>
              {ds.permMeta[id]?.title && (
                <span className="truncate text-xs text-gray-400">
                  {ds.permMeta[id].title}
                </span>
              )}
            </>
          ),
        })),
      });
    }
  }
  const flat = groups.flatMap((g) => g.items);

  // new suggestions invalidate a highlight pointing at the old list
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on list change
  useEffect(() => setHighlight(-1), [sugg]);

  const open = focusWithin && !dismissed && flat.length > 0;

  // cycle through [none, item 0, ..., item n-1]; -1 (none) is a stop so the
  // user can always get back to "Enter applies the query as typed"
  const moveHighlight = (delta: number) => {
    if (!open) return;
    const states = flat.length + 1;
    const idx = ((highlight + 1 + delta + states) % states) - 1;
    setHighlight(idx);
    listRef.current
      ?.querySelector(`[data-index="${idx}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (composing.current || e.nativeEvent.isComposing) return;
    const isCtrl = e.ctrlKey && !e.metaKey && !e.altKey;
    if (e.key === "ArrowDown" || (isCtrl && e.key === "n")) {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === "ArrowUp" || (isCtrl && e.key === "p")) {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === "Enter") {
      if (open && highlight >= 0) {
        e.preventDefault();
        flat[highlight].onSelect();
      } else {
        commit(text);
        setDismissed(true);
      }
    } else if (e.key === "Escape") {
      setDismissed(true);
    }
    // everything else (readline chords, Home/End, ...) is left to the browser
  };

  let itemIndex = -1;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: focus/blur only track whether focus is within the combobox
    <div
      ref={rootRef}
      className="relative flex-1"
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (rootRef.current?.contains(e.relatedTarget as Node | null)) return;
        setFocusWithin(false);
        setDismissed(false);
        commit(text);
      }}
    >
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="omnibox-listbox"
        aria-autocomplete="list"
        aria-activedescendant={
          open && highlight >= 0 ? `omnibox-option-${highlight}` : undefined
        }
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={t("header.searchLabel")}
        value={text}
        onChange={onChange}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={onKeyDown}
        placeholder={t("omnibox.placeholder")}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-purple-900"
      />
      {open && (
        <div
          ref={listRef}
          id="omnibox-listbox"
          role="listbox"
          aria-label={t("header.searchLabel")}
          // keep focus in the input while clicking options so the list
          // doesn't close from the blur before the click lands
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {groups.map((group) => (
            <div key={group.heading}>
              <span className={GROUP_HEADING}>{group.heading}</span>
              {group.items.map((item) => {
                itemIndex++;
                const idx = itemIndex;
                return (
                  <button
                    key={item.key}
                    type="button"
                    tabIndex={-1}
                    role="option"
                    id={`omnibox-option-${idx}`}
                    aria-selected={idx === highlight}
                    data-index={idx}
                    data-selected={idx === highlight || undefined}
                    onClick={item.onSelect}
                    className={ITEM}
                  >
                    {item.render}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
