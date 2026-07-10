import { hasBit, intersects, toBitset } from "./bitset";
import {
  type Dataset,
  isServiceAgent,
  type Role,
  roleServicePrefix,
  serviceDisplayName,
  shortRoleName,
} from "./data";

export interface ParsedQuery {
  s: string[];
  r: string[];
  p: string[];
  free: string[];
}

export function parseQuery(q: string): ParsedQuery {
  const parsed: ParsedQuery = { s: [], r: [], p: [], free: [] };
  for (const token of q.trim().toLowerCase().split(/\s+/)) {
    if (!token) continue;
    const m = token.match(/^([srp]):(.*)$/);
    if (m) {
      if (m[2]) parsed[m[1] as "s" | "r" | "p"].push(m[2]);
    } else {
      parsed.free.push(token);
    }
  }
  return parsed;
}

export function isEmptyQuery(parsed: ParsedQuery): boolean {
  return (
    parsed.s.length === 0 &&
    parsed.r.length === 0 &&
    parsed.p.length === 0 &&
    parsed.free.length === 0
  );
}

/** permission ids whose name contains the term */
export function matchingPermBits(ds: Dataset, term: string): Uint32Array {
  const ids: number[] = [];
  for (let i = 0; i < ds.permissions.length; i++) {
    if (ds.permissions[i].toLowerCase().includes(term)) ids.push(i);
  }
  return toBitset(ids, ds.bitsetWords);
}

/**
 * Filter role indexes by a parsed query. All terms are ANDed:
 * s: matches the role's service (prefix or display name),
 * r: matches role name/title, p: keeps roles containing a matching
 * permission, free terms match any of service/role name/title.
 */
export function filterRoles(ds: Dataset, parsed: ParsedQuery): number[] {
  const permBits = parsed.p.map((term) => matchingPermBits(ds, term));
  const result: number[] = [];
  for (let i = 0; i < ds.roles.length; i++) {
    if (roleMatches(ds, i, parsed, permBits)) result.push(i);
  }
  return result;
}

function roleMatches(
  ds: Dataset,
  roleIndex: number,
  parsed: ParsedQuery,
  permBits: Uint32Array[],
): boolean {
  const role = ds.roles[roleIndex];
  const short = shortRoleName(role.name).toLowerCase();
  const title = role.title.toLowerCase();
  const prefix = roleServicePrefix(role.name);
  const svcNames = [
    prefix ?? "",
    prefix ? serviceDisplayName(ds, prefix).toLowerCase() : "",
  ];
  // basic roles span all services: keep them under s: filters
  if (role.kind !== "basic") {
    for (const term of parsed.s) {
      if (!svcNames.some((n) => n.includes(term))) return false;
    }
  }
  for (const term of parsed.r) {
    if (!short.includes(term) && !title.includes(term)) return false;
  }
  for (const bits of permBits) {
    if (!intersects(ds.roleBits[roleIndex], bits)) return false;
  }
  for (const term of parsed.free) {
    if (
      !short.includes(term) &&
      !title.includes(term) &&
      !svcNames.some((n) => n.includes(term))
    ) {
      return false;
    }
  }
  return true;
}

/** substring match with a startsWith boost, for suggestion ranking */
function score(text: string, term: string): number {
  if (text.startsWith(term)) return 2;
  if (text.includes(term)) return 1;
  return 0;
}

export interface Suggestions {
  services: string[];
  roleIndexes: number[];
  permIds: number[];
}

/** Omnibox suggestions for the current input, grouped by entity kind. */
export function suggest(
  ds: Dataset,
  input: string,
  limit = 6,
  opts?: { includeServiceAgents?: boolean },
): Suggestions {
  const parsed = parseQuery(input);
  const last = input.trim().toLowerCase().split(/\s+/).pop() ?? "";
  const m = last.match(/^([srp]):(.*)$/);
  const kind = m ? (m[1] as "s" | "r" | "p") : null;
  const term = m ? m[2] : last;

  const services: [string, number][] = [];
  if (!kind || kind === "s") {
    for (const svc of ds.services) {
      const sc = Math.max(
        score(svc.prefix, term),
        score(svc.displayName.toLowerCase(), term),
      );
      if (sc > 0) services.push([svc.prefix, sc]);
    }
  }

  const roleIndexes: [number, number][] = [];
  if (!kind || kind === "r") {
    // restrict to roles matching the rest of the query (e.g. s: filters)
    const rest = { ...parsed, r: [], free: [] } as ParsedQuery;
    const permBits = rest.p.map((t) => matchingPermBits(ds, t));
    for (let i = 0; i < ds.roles.length; i++) {
      const role = ds.roles[i];
      if (!opts?.includeServiceAgents && isServiceAgent(role)) continue;
      const sc = Math.max(
        score(shortRoleName(role.name).toLowerCase(), term),
        score(role.title.toLowerCase(), term),
      );
      if (sc > 0 && roleMatches(ds, i, rest, permBits)) {
        roleIndexes.push([i, sc]);
      }
    }
  }

  const permIds: [number, number][] = [];
  if ((!kind && term.length >= 2) || kind === "p") {
    for (let i = 0; i < ds.permissions.length; i++) {
      const sc = score(ds.permissions[i], term);
      if (sc > 0) permIds.push([i, sc]);
    }
  }

  const top = <T>(xs: [T, number][]): T[] =>
    xs
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([x]) => x);
  return {
    services: top(services),
    roleIndexes: top(roleIndexes),
    permIds: top(permIds),
  };
}

/** Roles containing the permission, ordered by total permission count asc. */
export function rolesWithPermission(ds: Dataset, permId: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < ds.roles.length; i++) {
    if (hasBit(ds.roleBits[i], permId)) result.push(i);
  }
  return result.sort(
    (a, b) => ds.roles[a].permIds.length - ds.roles[b].permIds.length,
  );
}

export type { Role };
