import { permParts } from "./data";

export type BadgeTone = "danger" | "warn" | "info";

export interface Badge {
  id: string;
  label: string;
  tone: BadgeTone;
  hint: string;
}

const BADGES: Record<string, Badge> = {
  iam: {
    id: "iam",
    label: "IAM変更",
    tone: "danger",
    hint: "setIamPolicy を含む: このリソースのアクセス権設定を書き換えられる (権限昇格につながる)",
  },
  impersonate: {
    id: "impersonate",
    label: "なりすまし",
    tone: "danger",
    hint: "サービスアカウントの権限を借用できる (actAs / アクセストークン取得 / 署名)",
  },
  delete: {
    id: "delete",
    label: "削除系",
    tone: "warn",
    hint: "delete / purge などリソースを削除する操作を含む",
  },
  dataRead: {
    id: "dataRead",
    label: "データ閲覧",
    tone: "info",
    hint: "getData / read / export などデータの中身を読み取る操作を含む",
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

/** Distinct badges across a set of permissions, danger first. */
export function badgesForPermissions(permNames: Iterable<string>): Badge[] {
  const seen = new Map<string, Badge>();
  for (const name of permNames) {
    for (const b of badgesForPermission(name)) {
      seen.set(b.id, b);
    }
  }
  const order: BadgeTone[] = ["danger", "warn", "info"];
  return [...seen.values()].sort(
    (a, b) => order.indexOf(a.tone) - order.indexOf(b.tone),
  );
}
