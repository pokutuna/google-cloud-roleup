import { ALL_BADGES } from "../lib/badges";
import { type MsgKey, useT } from "../lib/i18n";
import type { ExplorerState } from "../lib/url-state";
import { BadgeTag, EntityChip } from "./primitives";

/** Single-qualifier example rendered as an EntityChip. */
const SINGLE_EXAMPLES: {
  q: string;
  kind: "s" | "r" | "p";
  label: string;
  descKey: MsgKey;
}[] = [
  {
    q: "s:bigquery ",
    kind: "s",
    label: "bigquery",
    descKey: "guide.exampleService",
  },
  {
    q: "r:bigquery.user ",
    kind: "r",
    label: "bigquery.user",
    descKey: "guide.exampleRole",
  },
  {
    q: "p:tables.getData ",
    kind: "p",
    label: "tables.getData",
    descKey: "guide.examplePermission",
  },
];

/** Compound (multi-qualifier) example rendered as a plain query button. */
const COMPOUND_EXAMPLE = {
  q: "s:bigquery p:tables ",
  descKey: "guide.exampleCompound" as MsgKey,
};

/** Empty-selection right pane: a short how-to with clickable examples. */
export function GuidePane({ state }: { state: ExplorerState }) {
  const t = useT();
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center gap-6 p-8 text-sm text-gray-600 dark:text-gray-300">
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Google Cloud RoleUp
          </h2>
          <p className="mt-1 text-sm text-gray-500">{t("app.subtitle")}</p>
        </div>
        <ul className="mt-3 list-inside list-disc space-y-1.5">
          <li>{t("guide.bullet1")}</li>
          <li>{t("guide.bullet2")}</li>
          <li>{t("guide.bullet3")}</li>
        </ul>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("guide.searchExamples")}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {SINGLE_EXAMPLES.map((ex) => (
            <li key={ex.q} className="flex items-center gap-2">
              <EntityChip
                kind={ex.kind}
                label={ex.label}
                onClick={() => state.setQ(ex.q)}
              />
              <span className="text-gray-400">{t(ex.descKey)}</span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => state.setQ(COMPOUND_EXAMPLE.q)}
              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 hover:underline cursor-pointer dark:bg-gray-800 dark:text-gray-300"
            >
              {COMPOUND_EXAMPLE.q.trim()}
            </button>
            <span className="text-gray-400">{t(COMPOUND_EXAMPLE.descKey)}</span>
          </li>
        </ul>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("guide.badgeMeaning")}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {ALL_BADGES.map((badge) => (
            <li key={badge.id} className="flex items-baseline gap-2">
              <BadgeTag badge={badge} />
              <span className="text-gray-400">{t(badge.hintKey)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
