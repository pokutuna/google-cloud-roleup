const BASIC_KEY = "__basic__";

/**
 * Order service group keys: basic roles first, then services directly
 * pinned (alphabetical), then services that only contain pinned roles
 * (alphabetical), then the remaining services (alphabetical).
 */
export function orderServiceKeys(
  keys: string[],
  pinnedServices: string[],
  servicesWithPinnedRoles: Set<string>,
): string[] {
  const pinnedSet = new Set(pinnedServices);
  const basic = keys.filter((key) => key === BASIC_KEY);
  const pinned = keys.filter((key) => key !== BASIC_KEY && pinnedSet.has(key));
  const containsPinnedRoles = keys.filter(
    (key) =>
      key !== BASIC_KEY &&
      !pinnedSet.has(key) &&
      servicesWithPinnedRoles.has(key),
  );
  const rest = keys.filter(
    (key) =>
      key !== BASIC_KEY &&
      !pinnedSet.has(key) &&
      !servicesWithPinnedRoles.has(key),
  );
  pinned.sort((a, b) => a.localeCompare(b));
  containsPinnedRoles.sort((a, b) => a.localeCompare(b));
  rest.sort((a, b) => a.localeCompare(b));
  return [...basic, ...pinned, ...containsPinnedRoles, ...rest];
}
