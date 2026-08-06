import { useI18n } from "@/lib/i18n";
import { BUSINESS } from "@/lib/config";
import { minutesIn } from "@/lib/tz";
import { cn } from "@/lib/cn";

interface Props {
  slots: string[];
  loading: boolean;
  value: string | null;
  onChange: (iso: string) => void;
}

export function TimeGrid({ slots, loading, value, onChange }: Props) {
  const { t, formatTime } = useI18n();

  if (loading) {
    return <p className="py-8 text-center text-sm text-cream/50">{t.booking.loadingSlots}</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-md border border-ink-700 bg-ink-900 py-8 text-center text-sm text-cream/50">
        {t.booking.noSlots}
      </p>
    );
  }

  const groups: { label: string; items: string[] }[] = [
    { label: t.booking.morning, items: [] },
    { label: t.booking.afternoon, items: [] },
    { label: t.booking.evening, items: [] },
  ];

  for (const iso of slots) {
    const minutes = minutesIn(new Date(iso), BUSINESS.timezone);
    const index = minutes < 12 * 60 ? 0 : minutes < 17 * 60 ? 1 : 2;
    groups[index].items.push(iso);
  }

  return (
    <div className="space-y-6">
      {groups
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <div key={group.label}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-cream/40">
              {group.label}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {group.items.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onChange(iso)}
                  aria-pressed={value === iso}
                  className={cn(
                    "rounded-md border py-2.5 text-sm font-semibold tabular-nums transition-colors",
                    value === iso
                      ? "border-gold bg-gold text-ink-950"
                      : "border-ink-600 text-cream/80 hover:border-gold/60 hover:text-cream",
                  )}
                >
                  {formatTime(new Date(iso))}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
