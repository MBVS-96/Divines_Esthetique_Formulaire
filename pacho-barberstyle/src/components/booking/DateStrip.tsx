import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { addDaysToKey, todayKey } from "@/lib/tz";
import { BUSINESS } from "@/lib/config";
import { cn } from "@/lib/cn";

interface Props {
  days: number;
  openDays: Set<string> | null;
  value: string | null;
  onChange: (key: string) => void;
}

/** Horizontal day picker — faster than a full calendar on a phone. */
export function DateStrip({ days, openDays, value, onChange }: Props) {
  const { t, lang } = useI18n();

  const keys = useMemo(() => {
    const start = todayKey(BUSINESS.timezone);
    return Array.from({ length: days }, (_, i) => addDaysToKey(start, i));
  }, [days]);

  const weekdayFmt = new Intl.DateTimeFormat(lang === "fr" ? "fr-CH" : lang === "es" ? "es-ES" : "en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
  const monthFmt = new Intl.DateTimeFormat(lang === "fr" ? "fr-CH" : lang === "es" ? "es-ES" : "en-GB", {
    month: "short",
    timeZone: "UTC",
  });

  const today = todayKey(BUSINESS.timezone);

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto pb-2" role="group" aria-label={t.booking.chooseDate}>
      {keys.map((key) => {
        const [y, m, d] = key.split("-").map(Number);
        const utc = new Date(Date.UTC(y, m - 1, d));
        const disabled = openDays !== null && !openDays.has(key);
        const selected = value === key;
        const label =
          key === today
            ? t.booking.today
            : key === addDaysToKey(today, 1)
              ? t.booking.tomorrow
              : weekdayFmt.format(utc);

        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            aria-pressed={selected}
            className={cn(
              "flex min-w-[74px] shrink-0 flex-col items-center gap-0.5 rounded-md border px-3 py-3 transition-colors",
              selected
                ? "border-gold bg-gold text-ink-950"
                : disabled
                  ? "cursor-not-allowed border-ink-800 text-cream/20"
                  : "border-ink-600 text-cream/80 hover:border-gold/60 hover:text-cream",
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
            <span className="font-display text-xl leading-none">{String(d).padStart(2, "0")}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-70">
              {monthFmt.format(utc)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
