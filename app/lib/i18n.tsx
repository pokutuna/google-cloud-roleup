import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { detectLang, getMessage, LANG_STORAGE_KEY } from "./i18n-data";
import type { Lang, Translate } from "./i18n-data";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {}
  }, []);

  const contextValue = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return (
    <LangContext.Provider value={contextValue}>{children}</LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = use(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}

export function useT(): Translate {
  const { lang } = useLang();
  return useMemo<Translate>(
    () => (key, params) => getMessage(lang, key, params),
    [lang],
  );
}
