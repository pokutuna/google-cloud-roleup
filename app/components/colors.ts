/**
 * Two independent color axes (§4.5 of the design doc):
 * - entity kind colors (fixed): service=teal / role=purple / permission=rose,
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
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    text: "text-rose-700 dark:text-rose-300",
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
 * The first four are Google's brand colors, in brand order: blue / red / yellow / green.
 * Yellow uses a darker tone for text/border since a light yellow is illegible.
 * The remaining four (orange / cyan / lime / slate) are an extension set that
 * spreads hues widely for maximum distinguishability, while staying clear of the
 * entity colors (teal / purple / rose). Slate is near-neutral, which helps it read
 * clearly as the eighth and last series. This extends the series for up to eight
 * comparable roles.
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
    name: "yellow",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-500",
    bg: "bg-yellow-500",
    bgSoft: "bg-yellow-200 dark:bg-yellow-900",
    checkbox: "accent-yellow-500",
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
    name: "orange",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500",
    bg: "bg-orange-500",
    bgSoft: "bg-orange-200 dark:bg-orange-900",
    checkbox: "accent-orange-600",
  },
  {
    name: "cyan",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500",
    bg: "bg-cyan-500",
    bgSoft: "bg-cyan-200 dark:bg-cyan-900",
    checkbox: "accent-cyan-600",
  },
  {
    name: "lime",
    text: "text-lime-700 dark:text-lime-400",
    border: "border-lime-500",
    bg: "bg-lime-500",
    bgSoft: "bg-lime-200 dark:bg-lime-900",
    checkbox: "accent-lime-600",
  },
  {
    name: "slate",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-500",
    bg: "bg-slate-500",
    bgSoft: "bg-slate-300 dark:bg-slate-800",
    checkbox: "accent-slate-600",
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
