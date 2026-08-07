import { Check, Copy, Link2, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useSearchParams } from "react-router";
import { useT } from "../lib/i18n";
import { ENTITY } from "./colors";

/**
 * Background of a highlighted row, split out because the sticky first column
 * paints its own background and has to repeat whatever the row is wearing.
 *
 * Each of these carries its own `hover:` variant. A row's own `hover:bg-*`
 * would otherwise win on specificity — `.hover\:bg-rose-50:hover` is (0,2,0)
 * against a plain utility's (0,1,0), so source order never comes into it — and
 * replace the tint outright. Deepening by one step on hover keeps the row
 * reading as highlighted while still acknowledging the cursor.
 */
export const HIGHLIGHT_BG =
  "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60";
export const HIGHLIGHT_BG_MEMBER =
  "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40";

/**
 * Same tints for the sticky column: the cursor sits over the row, not over the
 * cell, so these track the row's hover through `group-hover:` instead.
 */
export const HIGHLIGHT_BG_STICKY =
  "bg-amber-100 group-hover:bg-amber-200 dark:bg-amber-900/40 dark:group-hover:bg-amber-900/60";
export const HIGHLIGHT_BG_MEMBER_STICKY =
  "bg-amber-50 group-hover:bg-amber-100 dark:bg-amber-900/20 dark:group-hover:bg-amber-900/40";

/**
 * Highlight tint for a ?hl= target. Amber deliberately avoids the panes'
 * existing rose hover and the role series colors, so a highlighted row still
 * reads as highlighted while hovered.
 */
export const HIGHLIGHT_ROW = `${HIGHLIGHT_BG} ring-1 ring-inset ring-amber-400 dark:ring-amber-600`;

/**
 * Weaker tint for rows that are only swept in by a group target
 * ("service.group.*"). The named row keeps HIGHLIGHT_ROW, so the thing the
 * link actually points at stays the one that stands out.
 */
export const HIGHLIGHT_ROW_MEMBER = HIGHLIGHT_BG_MEMBER;

/**
 * Row-inline copy button: swaps to a check for a moment once the write lands.
 * `getText` runs on click so callers can build the payload lazily, and may
 * apply side effects (see CopyLinkButton syncing the URL).
 */
function CopyButton({
  getText,
  icon,
  label,
  labelCopied,
  className,
}: {
  getText: () => string;
  icon: ReactNode;
  label: string;
  labelCopied: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    // rows are clickable (reverse lookup / collapse) — this button is not that
    e.preventDefault();
    e.stopPropagation();
    const text = getText();
    try {
      await navigator.clipboard.writeText(text);
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
      title={copied ? labelCopied : label}
      aria-label={copied ? labelCopied : label}
      className={`shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 cursor-pointer dark:hover:bg-gray-700 dark:hover:text-gray-200 ${className ?? ""}`}
    >
      {copied ? (
        <Check size={12} className="inline-block text-green-600" />
      ) : (
        icon
      )}
    </button>
  );
}

/**
 * Copies `target` itself — the bare permission or group name, for pasting
 * into an IAM policy or a search box. Sits left of CopyLinkButton.
 */
export function CopyNameButton({
  target,
  className,
}: {
  target: string;
  className?: string;
}) {
  const t = useT();
  return (
    <CopyButton
      getText={() => target}
      icon={<Copy size={12} className="inline-block" />}
      label={t("link.copyName")}
      labelCopied={t("link.nameCopied")}
      className={className}
    />
  );
}

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

  const linkFor = () => {
    const next = new URLSearchParams(params);
    next.set("hl", target);
    const url = new URL(window.location.href);
    url.search = next.toString();
    // the address bar follows what was copied, so the link is verifiable and
    // the row highlights right away. replace: copying is not a navigation.
    setParams(next, { replace: true, preventScrollReset: true });
    return url.toString();
  };

  return (
    <CopyButton
      getText={linkFor}
      icon={<Link2 size={12} className="inline-block" />}
      label={t("link.copy")}
      labelCopied={t("link.copied")}
      className={className}
    />
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
