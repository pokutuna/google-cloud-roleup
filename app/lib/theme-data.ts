export type Theme = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "roleup.theme";

export const THEMES: Theme[] = ["system", "light", "dark"];

export function detectTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEMES.includes(stored as Theme)) return stored as Theme;
  } catch {}
  return "system";
}

export function prefersDark(): boolean {
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

export function isDark(theme: Theme): boolean {
  return theme === "dark" || (theme === "system" && prefersDark());
}
