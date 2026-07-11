import { X } from "lucide-react";
import type { Badge, BadgeWithMatches } from "../lib/badges";
import { useT } from "../lib/i18n";
import { BADGE_TONE, ENTITY } from "./colors";

export function EntityChip({
  kind,
  label,
  onClick,
  onRemove,
  title,
}: {
  kind: "s" | "r" | "p";
  label: string;
  onClick?: () => void;
  onRemove?: () => void;
  title?: string;
}) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${ENTITY[kind].chip}`}
      title={title}
    >
      <span className="opacity-60 font-mono">{kind}:</span>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="hover:underline cursor-pointer font-mono"
        >
          {label}
        </button>
      ) : (
        <span className="font-mono">{label}</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("primitives.deselect", { label })}
          className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
        >
          <X size={12} className="inline-block" />
        </button>
      )}
    </span>
  );
}

export function BadgeTag({ badge }: { badge: Badge | BadgeWithMatches }) {
  const t = useT();
  const matched = "matched" in badge ? badge.matched : undefined;
  const overflowCount =
    "overflowCount" in badge ? badge.overflowCount : undefined;
  const hint = t(badge.hintKey);
  const label = t(badge.labelKey);
  const matchedNames =
    matched && matched.length > 0
      ? [
          ...matched,
          ...(overflowCount
            ? [t("primitives.andMore", { n: overflowCount })]
            : []),
        ].join(", ")
      : undefined;
  const title = matchedNames
    ? `${hint}\n${t("primitives.matched", { names: matchedNames })}`
    : hint;
  return (
    <span
      title={title}
      className={`inline-block cursor-help rounded px-1 py-px text-[10px] font-medium whitespace-nowrap ${BADGE_TONE[badge.tone]}`}
    >
      {label}
    </span>
  );
}

/**
 * One-line notice shown when the top search bar's s:/p: tokens are
 * narrowing the pane's permission list. Mirrors MissTeaser's amber
 * tone but stays compact (text-xs) since it's a persistent indicator.
 */
export function PermFilterNotice({
  terms,
  shown,
  total,
  onClear,
}: {
  terms: string[];
  shown: number;
  total: number;
  onClear: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <span className="flex flex-wrap items-center gap-1">
        {terms.map((term) => (
          <span
            key={term}
            className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/60"
          >
            {term}
          </span>
        ))}
      </span>
      <span>{t("primitives.filteringBy", { total, shown })}</span>
      <button
        type="button"
        onClick={onClear}
        title={t("primitives.clearFilter")}
        aria-label={t("primitives.clearFilter")}
        className="ml-auto rounded p-0.5 text-amber-700 hover:bg-amber-100 hover:text-amber-900 cursor-pointer dark:text-amber-300 dark:hover:bg-amber-900/60 dark:hover:text-amber-100"
      >
        <X size={12} className="inline-block" />
      </button>
    </div>
  );
}

/** Stage marker: DEPRECATED gets a red tag, other non-GA stages stay muted gray. */
export function StageTag({ stage }: { stage?: string }) {
  if (!stage || stage === "GA") return null;
  return stage === "DEPRECATED" ? (
    <span className="rounded bg-red-100 px-1 text-[10px] font-medium uppercase text-red-700 dark:bg-red-950 dark:text-red-300">
      {stage}
    </span>
  ) : (
    <span className="text-[10px] uppercase text-gray-400">{stage}</span>
  );
}

/** "bigquery.dataViewer" -> dim "bigquery." + normal "dataViewer" */
export function MonoName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const dot = name.indexOf(".");
  if (dot === -1) {
    return <span className={`font-mono ${className ?? ""}`}>{name}</span>;
  }
  return (
    <span className={`font-mono ${className ?? ""}`}>
      <span className="opacity-70">{name.slice(0, dot + 1)}</span>
      {name.slice(dot + 1)}
    </span>
  );
}
