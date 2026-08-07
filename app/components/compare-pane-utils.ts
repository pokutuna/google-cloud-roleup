/**
 * Collapse bookkeeping for the comparison matrix.
 *
 * `collapsed` stores membership *relative to* `defaultOpen` rather than an
 * absolute "is folded" flag: with defaultOpen=false (large comparisons start
 * folded) a key in the set means "opened by hand". `forceOpen` sits on top and
 * unfolds whatever a ?hl= target lives under. Section headers use the same
 * store with defaultOpen=true, so their membership does mean "folded".
 */

/** Effective open state for a collapse key. */
export function isKeyOpen(
  collapsed: Set<string>,
  forceOpen: Set<string>,
  key: string,
  defaultOpen: boolean,
): boolean {
  if (forceOpen.has(key)) return true;
  return collapsed.has(key) ? !defaultOpen : defaultOpen;
}

/**
 * `collapsed` after toggling a key that currently renders as `open`. Derived
 * from the effective state, not by flipping membership: when forceOpen was
 * masking the stored value, a blind flip would leave the row unchanged and the
 * user would have to click twice.
 */
export function toggledCollapsed(
  collapsed: Set<string>,
  key: string,
  open: boolean,
  defaultOpen: boolean,
): Set<string> {
  const next = new Set(collapsed);
  // want the opposite of `open`; membership inverts defaultOpen
  if (!open === defaultOpen) next.delete(key);
  else next.add(key);
  return next;
}
