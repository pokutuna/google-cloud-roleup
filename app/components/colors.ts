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

const SERIES_COLORS: SeriesColor[] = [
  {
    name: "purple",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500",
    bg: "bg-purple-500",
    bgSoft: "bg-purple-200 dark:bg-purple-900",
    checkbox: "accent-purple-600",
  },
  {
    name: "sky",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500",
    bg: "bg-sky-500",
    bgSoft: "bg-sky-200 dark:bg-sky-900",
    checkbox: "accent-sky-600",
  },
  {
    name: "rose",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500",
    bg: "bg-rose-500",
    bgSoft: "bg-rose-200 dark:bg-rose-900",
    checkbox: "accent-rose-600",
  },
  {
    name: "emerald",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500",
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-200 dark:bg-emerald-900",
    checkbox: "accent-emerald-600",
  },
  {
    name: "orange",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500",
    bg: "bg-orange-500",
    bgSoft: "bg-orange-200 dark:bg-orange-900",
    checkbox: "accent-orange-600",
  },
];

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
