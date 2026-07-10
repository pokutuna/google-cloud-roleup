import { ALL_BADGES } from "../lib/badges";
import type { ExplorerState } from "../lib/url-state";
import { BadgeTag, EntityChip } from "./primitives";

/** Empty-selection right pane: a short how-to with clickable examples. */
export function GuidePane({ state }: { state: ExplorerState }) {
  const examples: {
    q: string;
    kind: "s" | "r" | "p";
    label: string;
    desc: string;
  }[] = [
    {
      q: "s:bigquery ",
      kind: "s",
      label: "s:bigquery",
      desc: "サービスでロールを絞り込む",
    },
    {
      q: "r:bigquery.user ",
      kind: "r",
      label: "r:bigquery.user",
      desc: "ロールを名前で探す",
    },
    {
      q: "p:tables.getData ",
      kind: "p",
      label: "p:tables.getData",
      desc: "パーミッションから逆引きする",
    },
    {
      q: "s:bigquery p:tables ",
      kind: "s",
      label: "s:bigquery p:tables",
      desc: "組み合わせ (AND) で絞り込む",
    },
  ];
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center gap-6 p-8 text-sm text-gray-600 dark:text-gray-300">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          IAM ロールを探す・見る・比べる
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5">
          <li>左のロールをクリックすると、詳細と関連ロールを表示します</li>
          <li>チェックボックスで 2 つ以上選ぶと、差分を比較します</li>
          <li>
            検索やチップの操作はすべて URL に載るので、そのまま共有できます
          </li>
        </ul>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          検索の例 (クリックで入力)
        </h3>
        <ul className="mt-2 space-y-1.5">
          {examples.map((ex) => (
            <li key={ex.q} className="flex items-center gap-2">
              <EntityChip
                kind={ex.kind}
                label={ex.label}
                onClick={() => state.setQ(ex.q)}
              />
              <span className="text-gray-400">{ex.desc}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          バッジの意味
        </h3>
        <ul className="mt-2 space-y-1.5">
          {ALL_BADGES.map((badge) => (
            <li key={badge.id} className="flex items-baseline gap-2">
              <BadgeTag badge={badge} />
              <span className="text-gray-400">{badge.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
