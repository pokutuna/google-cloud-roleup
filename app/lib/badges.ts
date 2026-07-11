import { permParts } from "./data";
import type { MsgKey } from "./i18n";

export type BadgeTone = "danger" | "warn" | "info";

export interface Badge {
  id: string;
  labelKey: MsgKey;
  tone: BadgeTone;
  hintKey: MsgKey;
}

const BADGES: Record<string, Badge> = {
  iam: {
    id: "iam",
    labelKey: "badge.iam.label",
    tone: "danger",
    hintKey: "badge.iam.hint",
  },
  impersonate: {
    id: "impersonate",
    labelKey: "badge.impersonate.label",
    tone: "danger",
    hintKey: "badge.impersonate.hint",
  },
  delete: {
    id: "delete",
    labelKey: "badge.delete.label",
    tone: "warn",
    hintKey: "badge.delete.hint",
  },
  dataRead: {
    id: "dataRead",
    labelKey: "badge.dataRead.label",
    tone: "info",
    hintKey: "badge.dataRead.hint",
  },
};

/** All badge definitions, for legends (e.g. GuidePane). */
export const ALL_BADGES: Badge[] = Object.values(BADGES);

const IMPERSONATE = new Set([
  "iam.serviceAccounts.actAs",
  "iam.serviceAccounts.getAccessToken",
  "iam.serviceAccounts.getOpenIdToken",
  "iam.serviceAccounts.signBlob",
  "iam.serviceAccounts.signJwt",
  "iam.serviceAccounts.implicitDelegation",
]);

export function badgesForPermission(permName: string): Badge[] {
  const { verb } = permParts(permName);
  const badges: Badge[] = [];
  if (verb === "setIamPolicy") badges.push(BADGES.iam);
  if (IMPERSONATE.has(permName)) badges.push(BADGES.impersonate);
  if (/^(delete|purge|destroy|remove|wipeout)/.test(verb)) {
    badges.push(BADGES.delete);
  }
  if (/^(getData|export|read)/.test(verb) || verb === "select") {
    badges.push(BADGES.dataRead);
  }
  return badges;
}

/** Max number of matched permission names to list in a badge's tooltip. */
const MAX_MATCHED = 8;

export type BadgeWithMatches = Badge & {
  matched?: string[];
  overflowCount?: number;
};

/**
 * Distinct badges across a set of permissions, danger first. Each badge
 * carries the actual permission names that triggered it (capped, with an
 * overflow count) so tooltips can show concrete evidence.
 */
export function badgesForPermissions(
  permNames: Iterable<string>,
): BadgeWithMatches[] {
  const matches = new Map<string, string[]>();
  for (const name of permNames) {
    for (const b of badgesForPermission(name)) {
      const list = matches.get(b.id);
      if (list) list.push(name);
      else matches.set(b.id, [name]);
    }
  }
  const order: BadgeTone[] = ["danger", "warn", "info"];
  return [...matches.entries()]
    .map(([id, names]) => {
      const badge = BADGES[id];
      const matched =
        names.length > MAX_MATCHED ? names.slice(0, MAX_MATCHED) : names;
      const overflowCount =
        names.length > MAX_MATCHED ? names.length - MAX_MATCHED : undefined;
      return { ...badge, matched, overflowCount };
    })
    .sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone));
}
