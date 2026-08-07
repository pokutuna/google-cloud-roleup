import { Check, Link2, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useT } from "../lib/i18n";
import { ENTITY } from "./colors";

/**
 * Highlight tint for a ?hl= target. Amber deliberately avoids the panes'
 * existing rose hover and the role series colors, so a highlighted row still
 * reads as highlighted while hovered.
 */
export const HIGHLIGHT_ROW =
  "bg-amber-100 dark:bg-amber-900/40 ring-1 ring-inset ring-amber-400 dark:ring-amber-600";

/**
 * Copies a deep link to the current view with ?hl= pointing at `target`.
 * Rendered inline in permission and group rows; the icon only materializes
 * on row hover (the caller supplies `group-hover` visibility).
 */
export function CopyLinkButton({
  target,
  className,
}: {
  target: string;
  className?: string;
}) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    // rows are clickable (reverse lookup / collapse) — this button is not that
    e.preventDefault();
    e.stopPropagation();
    const next = new URLSearchParams(params);
    next.set("hl", target);
    const url = new URL(window.location.href);
    url.search = next.toString();
    // the address bar follows what was copied, so the link is verifiable and
    // the row highlights right away. replace: copying is not a navigation.
    setParams(next, { replace: true, preventScrollReset: true });
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard denied (insecure context / permission): leave the icon as-is
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? t("link.copied") : t("link.copy")}
      aria-label={copied ? t("link.copied") : t("link.copy")}
      className={`shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 cursor-pointer dark:hover:bg-gray-700 dark:hover:text-gray-200 ${className ?? ""}`}
    >
      {copied ? (
        <Check size={12} className="inline-block text-green-600" />
      ) : (
        <Link2 size={12} className="inline-block" />
      )}
    </button>
  );
}

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

/**
 * One-line notice shown when the top search bar's s:/p: tokens are
 * narrowing the pane's permission list. Mirrors MissTeaser's rose
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
    <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      <span className="flex flex-wrap items-center gap-1">
        {terms.map((term) => (
          <span
            key={term}
            className="rounded bg-rose-100 px-1 font-mono dark:bg-rose-900/60"
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
        className="ml-auto rounded p-0.5 text-rose-700 hover:bg-rose-100 hover:text-rose-900 cursor-pointer dark:text-rose-300 dark:hover:bg-rose-900/60 dark:hover:text-rose-100"
      >
        <X size={12} className="inline-block" />
      </button>
    </div>
  );
}

/**
 * One-line banner for an active ?hl= highlight, with a dismiss button.
 * When `visible` is false the target isn't among the rows on screen (wrong
 * role, or hidden by the s:/p: filter), so the copy says as much.
 */
export function HighlightNotice({
  target,
  visible,
  onClear,
}: {
  target: string;
  visible: boolean;
  onClear: () => void;
}) {
  const t = useT();
  const tone = visible
    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400";
  return (
    <div
      className={`flex items-center gap-2 border-b px-3 py-1.5 text-xs ${tone}`}
    >
      <Link2 size={12} className="inline-block shrink-0" />
      <span className="min-w-0 truncate">
        {visible
          ? t("link.highlighting", { target })
          : t("link.notVisible", { target })}
      </span>
      <button
        type="button"
        onClick={onClear}
        title={t("link.clearHighlight")}
        aria-label={t("link.clearHighlight")}
        className="ml-auto shrink-0 rounded p-0.5 hover:bg-black/10 cursor-pointer dark:hover:bg-white/10"
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

/**
 * "bigquery.dataViewer" -> dim "bigquery." + normal "dataViewer".
 * A leading "roles/" (e.g. basic roles like "roles/admin") is dimmed too.
 */
export function MonoName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const slash = name.startsWith("roles/") ? "roles/".length : 0;
  const dot = name.indexOf(".");
  const split = dot === -1 ? slash : dot + 1;
  if (split === 0) {
    return <span className={`font-mono ${className ?? ""}`}>{name}</span>;
  }
  return (
    <span className={`font-mono ${className ?? ""}`}>
      <span className="opacity-70">{name.slice(0, split)}</span>
      {name.slice(split)}
    </span>
  );
}
