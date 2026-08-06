import { BadgeCheck, Briefcase, Home, Moon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Service } from "@/lib/types";

interface Props {
  service?: Service;
  onSelect: (service: Service) => void;
}

export function VipSection({ service, onSelect }: Props) {
  const { t, lang } = useI18n();
  if (!service) return null;

  return (
    <section id="vip" className="relative overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(120deg,#0a0a0b_0%,#1a1a1d_50%,#0a0a0b_100%)]"
      />
      <div className="container-x relative grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            <Moon className="h-3.5 w-3.5" />
            {t.vip.badge}
          </span>

          <h2 className="mt-6 font-display text-4xl tracking-widest text-cream sm:text-5xl">
            {t.vip.title}
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-cream/70">{t.vip.text}</p>

          <ul className="mt-8 space-y-3 text-sm text-cream/70">
            {[t.vip.point1, t.vip.point2, t.vip.point3].map((point) => (
              <li key={point} className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {point}
              </li>
            ))}
          </ul>

          <button type="button" className="btn-gold mt-9" onClick={() => onSelect(service)}>
            {t.vip.cta}
          </button>
        </div>

        <div className="card relative p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-display text-2xl tracking-wide text-cream">{service.name[lang]}</h3>
            <span className="font-display text-xl text-gold">{t.services.quote}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-cream/60">{service.description[lang]}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-ink-700 p-4">
              <Home className="h-5 w-5 text-gold" />
              <p className="mt-2 text-xs uppercase tracking-widest text-cream/50">
                {t.vip.point1}
              </p>
            </div>
            <div className="rounded-md border border-ink-700 p-4">
              <Briefcase className="h-5 w-5 text-gold" />
              <p className="mt-2 text-xs uppercase tracking-widest text-cream/50">
                {t.vip.point2}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
