import { type Dataset, permParts } from "../lib/data";

export interface FlatRow {
  type: "flat";
  id: number;
  name: string;
}

export interface GroupRow {
  type: "group";
  /** collapse key: "service" or "service.resource" */
  key: string;
  permIds: number[];
  /** whether this group is currently collapsed */
  collapsed: boolean;
}

export type Row = FlatRow | GroupRow;

/**
 * Walk permIds (assumed name-sorted, i.e. id order) and produce the rows to
 * render: every contiguous run sharing a resource group is preceded by a
 * group placeholder row. When the group is collapsed, only the placeholder
 * row is emitted.
 */
export function buildRows(
  ds: Dataset,
  permIds: number[],
  collapsed: Set<string>,
): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < permIds.length) {
    const parts = permParts(ds.permissions[permIds[i]]);
    const key = parts.group || parts.service;
    const run: number[] = [];
    while (i < permIds.length) {
      const current = permParts(ds.permissions[permIds[i]]);
      const rowKey = current.group || current.service;
      if (rowKey !== key) break;
      run.push(permIds[i]);
      i++;
    }
    const isCollapsed = collapsed.has(key);
    rows.push({ type: "group", key, permIds: run, collapsed: isCollapsed });
    if (!isCollapsed) {
      for (const id of run) {
        rows.push({ type: "flat", id, name: ds.permissions[id] });
      }
    }
  }
  return rows;
}

/**
 * Row index a ?hl= target should scroll to: the exact permission's flat row
 * when it is visible, otherwise its group's placeholder row. Returns -1 when
 * the target isn't in this list at all (filtered out, or another role's).
 */
export function findHighlightRow(
  rows: Row[],
  permId: number | undefined,
  groupKey: string,
): number {
  if (permId !== undefined) {
    const flat = rows.findIndex(
      (row) => row.type === "flat" && row.id === permId,
    );
    if (flat !== -1) return flat;
  }
  return rows.findIndex((row) => row.type === "group" && row.key === groupKey);
}

/** Every distinct resource key across permIds (used by "collapse all"). */
export function allResourceKeys(ds: Dataset, permIds: number[]): string[] {
  const keys = new Set<string>();
  for (const id of permIds) {
    const parts = permParts(ds.permissions[id]);
    keys.add(parts.group || parts.service);
  }
  return [...keys];
}
