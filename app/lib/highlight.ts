import { type Dataset, permParts } from "./data";
import { stripWildcard } from "./url-state";

/**
 * A resolved ?hl= target. `permId` is set only when the raw value named an
 * exact permission; `groupKey` is always set, so callers have a single thing
 * to unfold regardless of which form was used.
 */
export interface ResolvedHighlight {
  /** the raw ?hl= value, kept for round-tripping into copied links */
  raw: string;
  permId?: number;
  /** "service.resource" collapse key covering the target */
  groupKey: string;
}

/**
 * Accept both "service.group.action" (an exact permission) and
 * "service.group" / "service.group.*" (a whole resource group). A value that
 * matches a permission name wins over the group reading, since permission
 * names are the more specific ask; a value matching neither resolves to null
 * so the panes simply render as if no highlight was requested.
 */
export function resolveHighlight(
  ds: Dataset,
  raw: string | null,
): ResolvedHighlight | null {
  if (!raw) return null;

  const permId = ds.permIdByName.get(raw);
  if (permId !== undefined) {
    return { raw, permId, groupKey: permParts(raw).group };
  }

  // group form: an explicit "*" suffix is optional, so try the bare value too
  const key = stripWildcard(raw);
  if (!key) return null;
  for (let id = 0; id < ds.permissions.length; id++) {
    if (permParts(ds.permissions[id]).group === key) {
      return { raw, groupKey: key };
    }
  }
  return null;
}

/**
 * Whether a group header row is itself the target. Only the group form tints
 * the header: "service.group.action" asks for one permission, so `groupKey`
 * there merely says which group to unfold to reveal it.
 */
export function isGroupHighlighted(
  hl: ResolvedHighlight | null | undefined,
  groupKey: string,
): boolean {
  if (!hl || hl.permId !== undefined) return false;
  return hl.groupKey === groupKey;
}

/** Whether a permission id falls under the highlight (exact or by group). */
export function isPermHighlighted(
  ds: Dataset,
  hl: ResolvedHighlight | null,
  permId: number,
): boolean {
  if (!hl) return false;
  if (hl.permId !== undefined) return hl.permId === permId;
  return permParts(ds.permissions[permId]).group === hl.groupKey;
}

/**
 * How strongly a permission row should read. A group target sweeps in every
 * member, so those render "weak" and the group header carries the emphasis;
 * a permission target names exactly one row, which renders "strong".
 */
export type HighlightStrength = "none" | "weak" | "strong";

export function permHighlightStrength(
  ds: Dataset,
  hl: ResolvedHighlight | null | undefined,
  permId: number,
): HighlightStrength {
  if (!hl) return "none";
  if (hl.permId !== undefined) return hl.permId === permId ? "strong" : "none";
  return permParts(ds.permissions[permId]).group === hl.groupKey
    ? "weak"
    : "none";
}
