import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { TRANSLATIONS, LANGS, Lang } from "./translations";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  speechCode: string;
};

const I18nContext = createContext<Ctx | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("rk_lang")) as Lang | null;
    return stored && TRANSLATIONS[stored] ? stored : "en";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("rk_lang", l);
  }, []);

  const meta = LANGS.find((l) => l.code === lang)!;
  const dir = meta.rtl ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, String(v));
      return str;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir, speechCode: meta.speech }}>{children}</I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
