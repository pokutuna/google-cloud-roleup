import { useT } from "../lib/i18n";
import type { MsgKey } from "../lib/i18n-data";
import type { ExplorerState } from "../lib/url-state";
import { EntityChip, StageTag } from "./primitives";

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
/** Empty-selection right pane: a short how-to with clickable examples. */
export function GuidePane({ state }: { state: ExplorerState }) {
  const t = useT();
  return (
    <div className="flex h-full flex-col overflow-y-auto p-8 text-sm text-gray-600 dark:text-gray-300">
      <div className="mx-auto my-auto flex w-full max-w-lg flex-col gap-6">
        <div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Google Cloud RoleUp
              </h2>
              <span
                title={t("header.unofficialTooltip")}
                className="shrink-0 text-xs text-gray-400 dark:text-gray-500"
              >
                {t("header.unofficial")}
              </span>
            </div>
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
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("guide.stageMeaning")}
          </h3>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-baseline gap-2">
              <StageTag stage="DEPRECATED" />
              <span className="text-gray-400">
                {t("guide.stageDeprecated")}
              </span>
            </li>
            <li className="flex items-baseline gap-2">
              <StageTag stage="BETA" />
              <span className="text-gray-400">{t("guide.stageBeta")}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
