import {
  ChevronDown,
  ChevronRight,
  ListFilter,
  PanelLeftClose,
  Pin,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import {
  type Dataset,
  roleServicePrefix,
  serviceDisplayName,
  shortRoleName,
} from "../lib/data";
import { useT } from "../lib/i18n";
import { usePinnedRoles, usePinnedServices } from "../lib/pinned";
import type { ExplorerState } from "../lib/url-state";
import { MAX_COMPARE_ROLES, seriesColor } from "./colors";
import { MonoName, StageTag } from "./primitives";

const BASIC_KEY = "__basic__";
const PINNED_KEY = "__pinned__";
const OTHER_KEY = "__other__";

type Item =
  | { type: "header"; key: string; prefix: string | null; count: number }
  | { type: "role"; roleIndex: number; pinned?: boolean };

/**
 * Order service group keys: basic roles first, then services directly
 * pinned (alphabetical), then services that only contain pinned roles
 * (alphabetical), then the remaining services (alphabetical). A service
 * that is both directly pinned and contains pinned roles counts as
 * directly pinned. Only keys present in `keys` are included (groups with
 * 0 matching roles are already absent from the input).
 */
export function orderServiceKeys(
  keys: string[],
  pinnedServices: string[],
  servicesWithPinnedRoles: Set<string>,
): string[] {
  const pinnedSet = new Set(pinnedServices);
  const basic = keys.filter((k) => k === BASIC_KEY);
  const pinned = keys.filter((k) => k !== BASIC_KEY && pinnedSet.has(k));
  const containsPinnedRoles = keys.filter(
    (k) =>
      k !== BASIC_KEY && !pinnedSet.has(k) && servicesWithPinnedRoles.has(k),
  );
  const rest = keys.filter(
    (k) =>
      k !== BASIC_KEY && !pinnedSet.has(k) && !servicesWithPinnedRoles.has(k),
  );
  pinned.sort((a, b) => a.localeCompare(b));
  containsPinnedRoles.sort((a, b) => a.localeCompare(b));
  rest.sort((a, b) => a.localeCompare(b));
  return [...basic, ...pinned, ...containsPinnedRoles, ...rest];
}

/**
 * Sort a group's role indexes so pinned roles float to the top; both the
 * pinned and the remaining roles keep their incoming relative order
 * (already name-sorted upstream).
 */
function withPinnedRolesOnTop(
  indexes: number[],
  ds: Dataset,
  pinnedRoleSet: Set<string>,
): number[] {
  if (pinnedRoleSet.size === 0) return indexes;
  const pinned: number[] = [];
  const rest: number[] = [];
  for (const idx of indexes) {
    const short = shortRoleName(ds.roles[idx].name);
    if (pinnedRoleSet.has(short)) pinned.push(idx);
    else rest.push(idx);
  }
  if (pinned.length === 0) return indexes;
  return [...pinned, ...rest];
}

function RoleRow({
  ds,
  state,
  roleIndex,
  selected,
  selPos,
  inSelectionTray,
  rolePinned,
  onTogglePinRole,
  atCap,
}: {
  ds: Dataset;
  state: ExplorerState;
  roleIndex: number;
  selected: boolean;
  selPos: number;
  /** whether this row is rendered in the "selected" tray at the top */
  inSelectionTray?: boolean;
  rolePinned: boolean;
  onTogglePinRole: (shortName: string) => void;
  atCap?: boolean;
}) {
  const t = useT();
  const role = ds.roles[roleIndex];
  const short = shortRoleName(role.name);
  const disabled = !selected && atCap;
  return (
    <div
      className={`group flex items-center gap-2 border-b border-gray-50 px-2 py-1 text-sm dark:border-gray-900 ${
        inSelectionTray ? "border-l-2 border-l-purple-500" : ""
      } ${
        selected
          ? "bg-purple-50 dark:bg-purple-950/40"
          : "hover:bg-gray-50 dark:hover:bg-gray-900"
      }`}
    >
      <span className="flex w-4 shrink-0 justify-center">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={() => state.toggle({ type: "r", name: short })}
          title={
            disabled
              ? t("rolelist.maxCompare", { n: MAX_COMPARE_ROLES })
              : t("rolelist.addToCompare")
          }
          className={
            disabled
              ? "opacity-40"
              : `cursor-pointer ${selected ? seriesColor(selPos).checkbox : "accent-purple-600"}`
          }
        />
      </span>
      <button
        type="button"
        onClick={() => state.select({ type: "r", name: short })}
        className="flex min-w-0 flex-1 items-baseline gap-2 text-left cursor-pointer"
      >
        <span className="truncate text-gray-800 dark:text-gray-200">
          <MonoName name={short} />
        </span>
        {role.stage === "DEPRECATED" && <StageTag stage={role.stage} />}
        <span className="truncate text-xs text-gray-400">{role.title}</span>
        <span className="ml-auto shrink-0 text-xs text-gray-400">
          {role.permIds.length}
        </span>
      </button>
      <button
        type="button"
        title={rolePinned ? t("rolelist.unpin") : t("rolelist.pin")}
        aria-label={rolePinned ? t("rolelist.unpin") : t("rolelist.pin")}
        onClick={() => onTogglePinRole(short)}
        className={`rounded px-1 cursor-pointer ${
          rolePinned
            ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            : "text-gray-400 opacity-0 hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        }`}
      >
        <Pin size={12} className="inline-block" />
      </button>
    </div>
  );
}

export function RoleList({
  ds,
  state,
  roleIndexes,
  totalCount,
  onCollapse,
}: {
  ds: Dataset;
  state: ExplorerState;
  /** filtered role indexes to display */
  roleIndexes: number[];
  /** total role count with no query filter (current display settings) */
  totalCount: number;
  onCollapse: () => void;
}) {
  const t = useT();
  // default: collapsed when the query is empty, expanded once narrowed down
  const defaultOpen = state.q.trim().length > 0;
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const { pinned: pinnedServices, toggle: togglePinned } = usePinnedServices();
  const { pinned: pinnedRoleNames, toggle: togglePinnedRole } =
    usePinnedRoles();
  // q changed: reset per-group overrides back to the new default (render-time reset, no effect needed)
  const prevQ = useRef(state.q);
  if (prevQ.current !== state.q) {
    prevQ.current = state.q;
    if (toggled.size > 0) setToggled(new Set());
  }
  const selectedRoles = state.selection.filter((it) => it.type === "r");
  const pinnedIndexes = useMemo(
    () =>
      selectedRoles
        .map((it) => ds.roleIndexByName.get(`roles/${it.name}`))
        .filter((i): i is number => i !== undefined),
    [ds, selectedRoles],
  );

  const pinnedRoleSet = useMemo(
    () => new Set(pinnedRoleNames),
    [pinnedRoleNames],
  );

  // services that contain at least one pinned role, derived from *all*
  // roles (not just the currently filtered ones) so ordering stays stable
  // while searching.
  const servicesWithPinnedRoles = useMemo(() => {
    const set = new Set<string>();
    for (const short of pinnedRoleNames) {
      const idx = ds.roleIndexByName.get(`roles/${short}`);
      if (idx === undefined) continue;
      const role = ds.roles[idx];
      const key =
        role.kind === "basic"
          ? BASIC_KEY
          : (roleServicePrefix(role.name) ?? BASIC_KEY);
      set.add(key);
    }
    return set;
  }, [ds, pinnedRoleNames]);

  const items = useMemo(() => {
    const pinned: Item[] = [];
    if (pinnedIndexes.length > 0) {
      pinned.push({
        type: "header",
        key: PINNED_KEY,
        prefix: null,
        count: pinnedIndexes.length,
      });
      for (const idx of pinnedIndexes) {
        pinned.push({ type: "role", roleIndex: idx, pinned: true });
      }
    }

    // basic roles pinned on top, then services alphabetically
    const bySvc = new Map<string, number[]>();
    for (const idx of roleIndexes) {
      const role = ds.roles[idx];
      // prefix-less roles (kind basic, plus roles/browser) share the top group
      const key =
        role.kind === "basic"
          ? BASIC_KEY
          : (roleServicePrefix(role.name) ?? BASIC_KEY);
      const list = bySvc.get(key);
      if (list) list.push(idx);
      else bySvc.set(key, [idx]);
    }
    const keys = orderServiceKeys(
      [...bySvc.keys()],
      pinnedServices,
      servicesWithPinnedRoles,
    );
    const items: Item[] = [...pinned];
    for (const key of keys) {
      // biome-ignore lint/style/noNonNullAssertion: keys come from the map
      const list = bySvc.get(key)!;
      items.push({
        type: "header",
        key,
        prefix: key === BASIC_KEY || key === OTHER_KEY ? null : key,
        count: list.length,
      });
      // basic roles are always expanded by default; others follow defaultOpen
      const open = toggled.has(key)
        ? !(key === BASIC_KEY || defaultOpen)
        : key === BASIC_KEY || defaultOpen;
      const ordered = withPinnedRolesOnTop(list, ds, pinnedRoleSet);
      if (open) {
        for (const idx of ordered) items.push({ type: "role", roleIndex: idx });
      } else {
        // collapsed: still surface pinned roles right under the header
        for (const idx of ordered) {
          const short = shortRoleName(ds.roles[idx].name);
          if (pinnedRoleSet.has(short)) {
            items.push({ type: "role", roleIndex: idx });
          }
        }
      }
    }
    return items;
  }, [
    ds,
    roleIndexes,
    defaultOpen,
    toggled,
    pinnedIndexes,
    pinnedServices,
    pinnedRoleSet,
    servicesWithPinnedRoles,
  ]);

  const isOpen = (key: string) =>
    toggled.has(key)
      ? !(key === BASIC_KEY || defaultOpen)
      : key === BASIC_KEY || defaultOpen;

  const toggleOpen = (key: string) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const isFiltered = roleIndexes.length < totalCount;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {isFiltered ? (
          <span className="flex items-center gap-1">
            {t("rolelist.countFiltered", {
              shown: roleIndexes.length,
              total: totalCount,
            })}
            <button
              type="button"
              onClick={() => state.setQ("")}
              title={t("rolelist.clearSearch")}
              aria-label={t("rolelist.clearSearch")}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <X size={12} className="inline-block" />
            </button>
          </span>
        ) : (
          <span>{t("rolelist.count", { count: roleIndexes.length })}</span>
        )}
        <label className="ml-auto flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={state.showServiceAgents}
            onChange={(e) => state.setShowServiceAgents(e.target.checked)}
            className="cursor-pointer accent-purple-600"
          />
          {t("rolelist.showServiceAgents")}
        </label>
        <button
          type="button"
          onClick={onCollapse}
          title={t("rolelist.collapseList")}
          aria-label={t("rolelist.collapseList")}
          className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>
      <Virtuoso
        className="flex-1"
        totalCount={items.length}
        itemContent={(i) => {
          const item = items[i];
          if (item.type === "header") {
            if (item.key === PINNED_KEY) {
              return (
                <div className="flex items-center gap-1.5 border-b border-purple-200 border-l-2 border-l-purple-500 bg-purple-50 px-2 py-1 text-xs dark:border-purple-900 dark:border-l-purple-500 dark:bg-purple-950/40">
                  <span className="flex w-4" aria-hidden />
                  <span className="font-semibold text-purple-700 dark:text-purple-300">
                    {t("rolelist.selected")}
                  </span>
                  <span className="ml-auto text-purple-500 dark:text-purple-400">
                    {item.count}
                  </span>
                </div>
              );
            }
            const label =
              item.key === BASIC_KEY
                ? t("rolelist.basicRoles")
                : item.key === OTHER_KEY
                  ? t("rolelist.other")
                  : serviceDisplayName(ds, item.key);
            const opened = isOpen(item.key);
            const isPinned =
              item.prefix !== null && pinnedServices.includes(item.prefix);
            const isPinnedByRolesOnly =
              !isPinned &&
              item.prefix !== null &&
              servicesWithPinnedRoles.has(item.prefix);
            return (
              <div className="group flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-2 py-1 text-xs dark:border-gray-800 dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => toggleOpen(item.key)}
                  aria-label={t("rolelist.toggleGroup", {
                    label,
                    action: opened
                      ? t("rolelist.collapse")
                      : t("rolelist.expand"),
                  })}
                  className="flex flex-1 items-center gap-1.5 text-left cursor-pointer"
                >
                  <span aria-hidden className="flex w-4 text-gray-400">
                    {opened ? (
                      <ChevronDown size={14} className="inline-block" />
                    ) : (
                      <ChevronRight size={14} className="inline-block" />
                    )}
                  </span>
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    {label}
                  </span>
                  {item.prefix && (
                    <span className="font-mono text-gray-400">
                      {item.prefix}
                    </span>
                  )}
                  <span className="ml-auto text-gray-400">{item.count}</span>
                </button>
                {item.prefix && (
                  <button
                    type="button"
                    title={
                      isPinned
                        ? t("rolelist.unpin")
                        : isPinnedByRolesOnly
                          ? t("rolelist.containsPinnedRoles")
                          : t("rolelist.pin")
                    }
                    aria-label={
                      isPinned
                        ? t("rolelist.unpin")
                        : isPinnedByRolesOnly
                          ? t("rolelist.containsPinnedRoles")
                          : t("rolelist.pin")
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      // biome-ignore lint/style/noNonNullAssertion: guarded by item.prefix above
                      togglePinned(item.prefix!);
                    }}
                    className={`rounded px-1 cursor-pointer ${
                      isPinned
                        ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        : isPinnedByRolesOnly
                          ? "text-amber-300 hover:bg-amber-50 dark:text-amber-700 dark:hover:bg-amber-950/40"
                          : "text-gray-400 opacity-0 hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    }`}
                  >
                    <Pin size={12} className="inline-block" />
                  </button>
                )}
                {item.prefix && (
                  <button
                    type="button"
                    title={t("rolelist.filterByService", {
                      prefix: item.prefix,
                    })}
                    aria-label={t("rolelist.filterByService", {
                      prefix: item.prefix,
                    })}
                    onClick={(e) => {
                      e.stopPropagation();
                      state.setQ(`s:${item.prefix} `);
                    }}
                    className="rounded px-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <ListFilter size={12} className="inline-block" />
                  </button>
                )}
              </div>
            );
          }
          const short = shortRoleName(ds.roles[item.roleIndex].name);
          const selPos = selectedRoles.findIndex((it) => it.name === short);
          const selected = selPos >= 0;
          return (
            <RoleRow
              ds={ds}
              state={state}
              roleIndex={item.roleIndex}
              selected={selected}
              selPos={selPos}
              inSelectionTray={item.pinned}
              rolePinned={pinnedRoleSet.has(short)}
              onTogglePinRole={togglePinnedRole}
              atCap={selectedRoles.length >= MAX_COMPARE_ROLES}
            />
          );
        }}
      />
    </div>
  );
}
