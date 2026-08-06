import { Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Service } from "@/lib/types";

interface Props {
  services: Service[];
  onSelect: (service: Service) => void;
}

export function Services({ services, onSelect }: Props) {
  const { t, lang, formatPrice, formatDuration } = useI18n();
  const salon = services.filter((s) => !s.atHome);

  return (
    <section id="services" className="border-t border-ink-800 bg-ink-900/40 py-20 sm:py-28">
      <div className="container-x">
        <h2 className="font-display text-4xl tracking-widest text-cream sm:text-5xl">
          {t.services.title}
        </h2>
        <p className="mt-3 text-cream/60">{t.services.subtitle}</p>
        <div className="rule mt-8" />

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {salon.map((service) => (
            <li key={service.id} className="card flex flex-col p-6 transition-colors hover:border-gold/50">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-2xl tracking-wide text-cream">
                  {service.name[lang]}
                </h3>
                <span className="whitespace-nowrap font-display text-2xl text-gold">
                  {service.showPrice && service.priceChf !== null
                    ? `${formatPrice(service.priceChf)}.−`
                    : t.services.quote}
                </span>
              </div>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-cream/60">
                {service.description[lang]}
              </p>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-ink-700 pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-cream/40">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(service.durationMin)}
                </span>
                <button type="button" className="btn-gold px-4 py-2 text-xs" onClick={() => onSelect(service)}>
                  {t.services.book}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-cream/40">
          {t.common.chf} · {t.contact.hoursValue}
        </p>
      </div>
    </section>
  );
}
