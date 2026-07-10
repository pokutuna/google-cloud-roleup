import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { badgesForPermissions } from "../lib/badges";
import { type Dataset, permParts } from "../lib/data";
import { BadgeTag, MonoName } from "./primitives";

interface Group {
  key: string;
  permIds: number[];
}

function groupPerms(ds: Dataset, permIds: number[]): Group[] {
  const map = new Map<string, number[]>();
  for (const id of permIds) {
    const key = permParts(ds.permissions[id]).group;
    const list = map.get(key);
    if (list) list.push(id);
    else map.set(key, [id]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ids]) => ({ key, permIds: ids }));
}

/**
 * Permissions grouped by "service.resource" with istanbul-style rollup
 * counts and collapsible groups. Shared by the detail pane, comparison
 * sections and the reverse-lookup pane.
 */
export function PermGroupList({
  ds,
  permIds,
  defaultOpen,
  onSelectPerm,
}: {
  ds: Dataset;
  permIds: number[];
  defaultOpen?: boolean;
  onSelectPerm: (permName: string) => void;
}) {
  const groups = groupPerms(ds, permIds);
  // default: expand when the list is small enough to scan
  const open = defaultOpen ?? permIds.length <= 60;
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const isOpen = (key: string) => (toggled.has(key) ? !open : open);
  const toggle = (key: string) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="text-sm">
      {groups.map((g) => {
        const names = g.permIds.map((id) => ds.permissions[id]);
        const badges = badgesForPermissions(names);
        const opened = isOpen(g.key);
        return (
          <div
            key={g.key}
            className="border-b border-gray-100 dark:border-gray-800 last:border-b-0"
          >
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
            >
              <span className="flex w-3 text-gray-400">
                {opened ? (
                  <ChevronDown size={14} className="inline-block" />
                ) : (
                  <ChevronRight size={14} className="inline-block" />
                )}
              </span>
              <MonoName
                name={g.key}
                className="font-medium text-gray-800 dark:text-gray-200"
              />
              <span className="text-xs text-gray-400">{g.permIds.length}</span>
              <span className="ml-auto flex gap-1">
                {badges.map((b) => (
                  <BadgeTag key={b.id} badge={b} />
                ))}
              </span>
            </button>
            {opened && (
              <ul className="pb-1">
                {g.permIds.map((id) => {
                  const name = ds.permissions[id];
                  const meta = ds.permMeta[id];
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => onSelectPerm(name)}
                        title={meta?.description ?? name}
                        className="flex w-full items-baseline gap-2 py-0.5 pr-2 pl-7 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                      >
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {permParts(name).verb}
                        </span>
                        {meta?.title && (
                          <span className="truncate text-xs text-gray-400">
                            {meta.title}
                          </span>
                        )}
                        {meta?.stage && (
                          <span className="text-[10px] uppercase text-gray-400">
                            {meta.stage}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
