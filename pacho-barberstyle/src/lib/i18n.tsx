import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { fr } from "@/locales/fr";
import type { Dict } from "@/locales/fr";
import { en } from "@/locales/en";
import { es } from "@/locales/es";
import { LANGS, type Lang } from "./types";
import { BUSINESS } from "./config";

const DICTS: Record<Lang, Dict> = { fr, en, es };

/** Swiss French formats: DD.MM.YYYY and 24h clock. */
const DATE_LOCALES: Record<Lang, string> = {
  fr: "fr-CH",
  en: "en-GB",
  es: "es-ES",
};

const STORAGE_KEY = "pbs.lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored && LANGS.includes(stored)) return stored;
  for (const candidate of navigator.languages ?? [navigator.language]) {
    const short = candidate.slice(0, 2).toLowerCase() as Lang;
    if (LANGS.includes(short)) return short;
  }
  return "fr";
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
  /** Replace {placeholders} in a translated string. */
  fill: (template: string, vars: Record<string, string | number>) => string;
  formatDate: (date: Date, opts?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date) => string;
  formatPrice: (chf: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLang());

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = DICTS[lang].meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", DICTS[lang].meta.description);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const locale = DATE_LOCALES[lang];
    return {
      lang,
      setLang,
      t: DICTS[lang],
      fill: (template, vars) =>
        template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`)),
      formatDate: (date, opts) =>
        new Intl.DateTimeFormat(locale, {
          timeZone: BUSINESS.timezone,
          day: "2-digit",
          month: "long",
          year: "numeric",
          ...opts,
        }).format(date),
      formatTime: (date) =>
        new Intl.DateTimeFormat(locale, {
          timeZone: BUSINESS.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(date),
      formatPrice: (chf) =>
        new Intl.NumberFormat("de-CH", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(chf),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
