import { useI18n } from "@/lib/i18n";
import { LANGS } from "@/lib/types";
import { cn } from "@/lib/cn";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={cn("flex items-center gap-1 text-xs font-semibold", className)}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-current={lang === code}
          className={cn(
            "rounded px-2 py-1 uppercase tracking-widest transition-colors",
            lang === code ? "bg-gold text-ink-950" : "text-cream/50 hover:text-cream",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
