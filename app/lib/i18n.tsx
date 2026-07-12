import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Lang = "en" | "ja";
const STORAGE_KEY = "roleup.lang";

/** Available languages; add an entry (and a MESSAGES column) to add a locale. */
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
];

export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ja") return stored;
  } catch {}
  return navigator.language.startsWith("ja") ? "ja" : "en";
}

const MESSAGES = {
  "app.subtitle": {
    ja: "Google Cloud IAM ロールを探す・見る・比べる",
    en: "Explore & compare Google Cloud IAM roles",
  },
  "app.loading": {
    ja: "IAM ロールデータを読み込み中...",
    en: "Loading IAM role data...",
  },
  "app.metaDescription": {
    ja: "Google Cloud IAM のロールとパーミッションを探す・見る・比べるエクスプローラ",
    en: "An explorer to search, inspect and compare Google Cloud IAM roles and permissions",
  },

  // HeaderBar
  "legend.service": { ja: "サービス", en: "service" },
  "legend.role": { ja: "ロール", en: "roles" },
  "legend.permission": { ja: "パーミッション", en: "permissions" },
  "legend.lead": { ja: "", en: "A" },
  "legend.afterService": { ja: "の下に", en: "contains" },
  "legend.afterRole": { ja: "があり、その中身は", en: ", each a set of" },
  "legend.tail": {
    ja: "の集合です。チップをクリックすると検索構文が入力されます。",
    en: ". Click a chip to insert its search qualifier.",
  },
  "header.deselectAll": { ja: "すべて解除", en: "Deselect all" },
  "header.dataStats": {
    ja: "data: {date} · {roles} roles · {perms} permissions",
    en: "data: {date} · {roles} roles · {perms} permissions",
  },
  "header.settings": { ja: "設定", en: "Settings" },
  "header.resetPinnedServices": {
    ja: "ピン留めをリセット",
    en: "Reset pins",
  },
  "header.searchLabel": {
    ja: "ロール・パーミッション検索",
    en: "Search roles & permissions",
  },
  "header.unofficial": { ja: "Unofficial", en: "Unofficial" },
  "header.unofficialTooltip": {
    ja: "Google 非公式のツールです",
    en: "Not an official Google product",
  },
  "header.repository": { ja: "GitHub リポジトリ", en: "GitHub repository" },

  // Omnibox
  "omnibox.placeholder": {
    ja: "検索: s:bigquery p:tables.getData owner ... (s:=サービス r:=ロール p:=パーミッション)",
    en: "Search: s:bigquery p:tables.getData owner ... (s:=service r:=role p:=permission)",
  },
  "omnibox.groupService": { ja: "サービス", en: "Services" },
  "omnibox.groupRole": { ja: "ロール", en: "Roles" },
  "omnibox.groupPermission": { ja: "パーミッション", en: "Permissions" },

  // RoleList
  "rolelist.countFiltered": {
    ja: "{shown} / {total} ロール",
    en: "{shown} / {total} roles",
  },
  "rolelist.count": { ja: "{count} ロール", en: "{count} roles" },
  "rolelist.clearSearch": { ja: "検索をクリア", en: "Clear search" },
  "rolelist.showServiceAgents": {
    ja: "サービスエージェントを表示",
    en: "Show service agents",
  },
  "rolelist.collapseList": { ja: "リストを畳む", en: "Collapse list" },
  "rolelist.selected": { ja: "選択中", en: "Selected" },
  "rolelist.basicRoles": { ja: "基本ロールなど", en: "Basic roles etc." },
  "rolelist.other": { ja: "その他", en: "Other" },
  "rolelist.addToCompare": { ja: "比較に追加", en: "Add to comparison" },
  "rolelist.maxCompare": {
    ja: "比較は最大 {n} ロールまで",
    en: "Up to {n} roles can be compared",
  },
  "rolelist.unpin": { ja: "ピン留めを外す", en: "Unpin" },
  "rolelist.pin": { ja: "ピン留め", en: "Pin" },
  "rolelist.expand": { ja: "展開する", en: "expand" },
  "rolelist.collapse": { ja: "折りたたむ", en: "collapse" },
  "rolelist.toggleGroup": { ja: "{label} を{action}", en: "{action} {label}" },
  "rolelist.filterByService": {
    ja: "s:{prefix} で絞り込む",
    en: "Filter by s:{prefix}",
  },
  "rolelist.containsPinnedRoles": {
    ja: "ピン留めしたロールを含みます (クリックでサービス自体をピン留め)",
    en: "Contains pinned roles (click to pin this service)",
  },

  // DetailPane
  "detail.permissions": { ja: "パーミッション", en: "permissions" },
  "detail.clickToReverseLookup": {
    ja: "パーミッションをクリックすると、それを含むロールを逆引きします",
    en: "Click a permission to find roles that hold it",
  },
  "detail.notIncluded": {
    ja: "「{term}」に一致するパーミッションはありません。",
    en: "No permissions match “{term}”.",
  },
  "detail.notInThisRole": {
    ja: "このロールには含まれません",
    en: "Not included in this role",
  },
  "detail.reverseLookupCount": {
    ja: "「{term}」を含むロール {count} 件を逆引きする →",
    en: "Find {count} roles that include “{term}” →",
  },
  "detail.relatedRoles": { ja: "関連ロール", en: "Related roles" },
  "detail.relatedRolesHint": {
    ja: "クリックで移動 / +比較 で差分表示",
    en: "Click to go / +Compare to show diff",
  },
  "detail.diffHint": {
    ja: "+増える / −減る: このロールから乗り換えた場合のパーミッション数の増減",
    en: "+gained / −lost: permission count change if switching from this role",
  },
  "detail.supersets": {
    ja: "このロールを完全に含むロール",
    en: "Roles that fully contain this role",
  },
  "detail.subsets": {
    ja: "このロールに完全に含まれるロール",
    en: "Roles fully contained in this role",
  },
  "detail.similar": { ja: "近いロール", en: "Similar roles" },
  "detail.complements": {
    ja: "重複しないロール (同サービス)",
    en: "Non-overlapping roles (same service)",
  },
  "detail.addCompare": { ja: "+比較", en: "+Compare" },

  // ComparePane
  "compare.title": { ja: "比較: {n} ロール", en: "Compare: {n} roles" },
  "compare.showCommon": { ja: "共通も表示 ({n})", en: "Show common ({n})" },
  "compare.showUnheld": {
    ja: "未保持の権限も表示",
    en: "Show permissions not held",
  },
  "compare.sortDiff": { ja: "差分でグループ化", en: "Group by diff" },
  "compare.sortName": { ja: "permission 名順", en: "By permission name" },
  "compare.groupsAndRows": {
    ja: "{groups} グループ / {rows} 権限",
    en: "{groups} groups / {rows} permissions",
  },
  "compare.permissionColumn": { ja: "権限", en: "Permission" },
  "compare.common": { ja: "共通", en: "Common" },
  "compare.allShared": { ja: "共通 ", en: "Shared " },
  "compare.reverseOrder": { ja: "逆順", en: "Reverse" },
  "compare.onlyIn": { ja: "{name} のみ", en: "{name} only" },
  "compare.unheld": { ja: "未保持", en: "Not held" },
  "compare.none": { ja: "該当なし (0 件)", en: "No entries" },

  // ReversePane
  "reverse.service": { ja: "サービス", en: "Service" },
  "reverse.sameResourcePerms": {
    ja: "同じリソースのパーミッション ({group}.*)",
    en: "Permissions on the same resource ({group}.*)",
  },
  "reverse.rolesWithPermission": {
    ja: "このパーミッションを含むロール ({n})",
    en: "Roles with this permission ({n})",
  },
  "reverse.hiddenServiceAgents": {
    ja: "サービスエージェント {n} 件を非表示",
    en: "{n} service agents hidden",
  },
  "reverse.predefinedRoles": { ja: "事前定義ロール", en: "Predefined roles" },
  "reverse.basicRoles": { ja: "基本ロール", en: "Basic roles" },
  "reverse.sortByCount": { ja: "パーミッション数", en: "By permission count" },
  "reverse.sortByName": { ja: "名前", en: "By name" },
  "reverse.closeBackToRole": {
    ja: "閉じてロール表示に戻る",
    en: "Close and return to role view",
  },
  "reverse.close": { ja: "閉じる", en: "Close" },

  // GuidePane
  "guide.bullet1": {
    ja: "左のロールをクリックすると、詳細と関連ロールを表示します",
    en: "Click a role on the left to see details and related roles",
  },
  "guide.bullet2": {
    ja: "チェックボックスで 2 つ以上選ぶと、差分を比較します",
    en: "Check 2 or more roles to compare their differences",
  },
  "guide.bullet3": {
    ja: "検索やチップの操作はすべて URL に載るので、そのまま共有できます",
    en: "Search and selections are encoded in the URL, so you can share the link as-is",
  },
  "guide.searchExamples": {
    ja: "検索の例 (クリックで入力)",
    en: "Search examples (click to try)",
  },
  "guide.exampleService": {
    ja: "サービスでロールを絞り込む",
    en: "Filter roles by service",
  },
  "guide.exampleRole": {
    ja: "ロールを名前で探す",
    en: "Find a role by name",
  },
  "guide.examplePermission": {
    ja: "パーミッションから逆引きする",
    en: "Reverse-lookup from a permission",
  },
  "guide.exampleCompound": {
    ja: "組み合わせ (AND) で絞り込む",
    en: "Combine qualifiers (AND) to narrow down",
  },
  "guide.badgeMeaning": { ja: "バッジの意味", en: "Badge meanings" },

  // PermGroupList
  "permgroup.collapseAll": { ja: "すべて畳む", en: "Collapse all" },
  "permgroup.expandAll": { ja: "すべて展開", en: "Expand all" },
  "permgroup.clickToExpand": { ja: "クリックで展開", en: "Click to expand" },
  "permgroup.collapseInto": {
    ja: "{key}.* にまとめる (クリックで畳む)",
    en: "Group into {key}.* (click to collapse)",
  },

  // primitives
  "primitives.deselect": { ja: "{label} を選択解除", en: "Deselect {label}" },
  "primitives.filteringBy": {
    ja: "で絞り込み中 ({total} 件中 {shown} 件)",
    en: "filtering ({shown} of {total})",
  },
  "primitives.clearFilter": {
    ja: "検索によるフィルタを解除",
    en: "Clear search filter",
  },
  "primitives.matched": { ja: "該当: {names}", en: "Matched: {names}" },
  "primitives.andMore": { ja: "ほか {n} 件", en: "and {n} more" },

  // home.tsx
  "home.showList": { ja: "リストを表示", en: "Show list" },
  "home.backToList": { ja: "一覧に戻る", en: "Back to list" },
  "home.tabList": { ja: "一覧", en: "List" },
  "home.tabDetail": { ja: "詳細", en: "Detail" },
  "home.tabCompare": { ja: "比較 ({n})", en: "Compare ({n})" },
  "home.tabReverse": { ja: "逆引き", en: "Lookup" },

  // Badges
  "badge.iam.label": { ja: "IAM変更", en: "IAM change" },
  "badge.iam.hint": {
    ja: "setIamPolicy を含む: このリソースのアクセス権設定を書き換えられる (権限昇格につながる)",
    en: "Includes setIamPolicy: can rewrite this resource's access policy (can lead to privilege escalation)",
  },
  "badge.impersonate.label": { ja: "なりすまし", en: "Impersonation" },
  "badge.impersonate.hint": {
    ja: "サービスアカウントの権限を借用できる (actAs / アクセストークン取得 / 署名)",
    en: "Can borrow a service account's privileges (actAs / obtain access tokens / signing)",
  },
  "badge.delete.label": { ja: "削除系", en: "Delete" },
  "badge.delete.hint": {
    ja: "delete / purge などリソースを削除する操作を含む",
    en: "Includes operations that delete resources, such as delete / purge",
  },
  "badge.dataRead.label": { ja: "データ閲覧", en: "Data read" },
  "badge.dataRead.hint": {
    ja: "getData / read / export などデータの中身を読み取る操作を含む",
    en: "Includes operations that read data contents, such as getData / read / export",
  },

  // Lang switcher
  "lang.switch": { ja: "言語を切り替える", en: "Switch language" },
} as const satisfies Record<string, { ja: string; en: string }>;

export type MsgKey = keyof typeof MESSAGES;

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}

function format(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match,
  );
}

export type Translate = (
  key: MsgKey,
  params?: Record<string, string | number>,
) => string;

/** Non-hook lookup for use outside React (e.g. route meta functions). */
export function getMessage(
  lang: Lang,
  key: MsgKey,
  params?: Record<string, string | number>,
): string {
  return format(MESSAGES[key][lang], params);
}

export function useT(): Translate {
  const { lang } = useLang();
  return useMemo<Translate>(
    () => (key, params) => format(MESSAGES[key][lang], params),
    [lang],
  );
}
