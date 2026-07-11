/**
 * Two independent color axes (§4.5 of the design doc):
 * - entity kind colors (fixed): service=teal / role=purple / permission=amber,
 *   used only on chips, suggestions and legend;
 * - per-role series colors, assigned by position in the comparison set,
 *   used only on comparison visuals (section borders, ratio bars, coverage).
 */

export const ENTITY = {
  s: {
    chip: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
    text: "text-teal-700 dark:text-teal-300",
  },
  r: {
    chip: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    text: "text-purple-700 dark:text-purple-300",
  },
  p: {
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
  },
} as const;

export interface SeriesColor {
  name: string;
  text: string;
  border: string;
  /** solid segment (shared / owned) */
  bg: string;
  /** pale segment (surplus) */
  bgSoft: string;
  checkbox: string;
}

/**
 * Google rainbow first (blue / red / green — yellow is skipped because it is
 * illegible as text and collides with the permission amber), then fuchsia.
 * All hues stay clear of the entity colors (teal / purple / amber).
 */
const SERIES_COLORS: SeriesColor[] = [
  {
    name: "blue",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500",
    bg: "bg-blue-500",
    bgSoft: "bg-blue-200 dark:bg-blue-900",
    checkbox: "accent-blue-600",
  },
  {
    name: "red",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-500",
    bg: "bg-red-500",
    bgSoft: "bg-red-200 dark:bg-red-900",
    checkbox: "accent-red-600",
  },
  {
    name: "green",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-600",
    bg: "bg-green-600",
    bgSoft: "bg-green-200 dark:bg-green-900",
    checkbox: "accent-green-600",
  },
  {
    name: "fuchsia",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-500",
    bg: "bg-fuchsia-500",
    bgSoft: "bg-fuchsia-200 dark:bg-fuchsia-900",
    checkbox: "accent-fuchsia-600",
  },
];

/** Comparison is capped at the number of distinguishable series colors. */
export const MAX_COMPARE_ROLES = SERIES_COLORS.length;

export function seriesColor(index: number): SeriesColor {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

export const COMMON_SECTION = {
  text: "text-gray-600 dark:text-gray-400",
  border: "border-gray-400 dark:border-gray-600",
  bg: "bg-gray-400 dark:bg-gray-500",
} as const;

export const BADGE_TONE = {
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  warn: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
} as const;
