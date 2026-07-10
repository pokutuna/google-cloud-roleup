import { X } from "lucide-react";
import type { Badge } from "../lib/badges";
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
          aria-label={`${label} を選択解除`}
          className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
        >
          <X size={12} className="inline-block" />
        </button>
      )}
    </span>
  );
}

export function BadgeTag({ badge }: { badge: Badge }) {
  return (
    <span
      title={badge.hint}
      className={`inline-block cursor-help rounded px-1 py-px text-[10px] font-medium whitespace-nowrap ${BADGE_TONE[badge.tone]}`}
    >
      {badge.label}
    </span>
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
      <span className="opacity-45">{name.slice(0, dot + 1)}</span>
      {name.slice(dot + 1)}
    </span>
  );
}
