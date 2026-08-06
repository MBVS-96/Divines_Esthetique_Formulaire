import { CalendarCheck, Clock, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SectionLink } from "./SectionLink";

export function Hero() {
  const { t } = useI18n();

  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Placeholder backdrop — swap for a photo of the shop in Lovable. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#26262b_0%,#0a0a0b_60%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
      />

      <div className="container-x relative">
        <div className="max-w-2xl animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            <CalendarCheck className="h-3.5 w-3.5" />
            {t.hero.badge}
          </span>

          <h1 className="mt-6 font-display text-6xl leading-[0.95] tracking-[0.04em] text-cream sm:text-8xl">
            {t.hero.title}
          </h1>
          <p className="mt-3 text-lg font-medium uppercase tracking-[0.3em] text-gold">
            {t.hero.subtitle}
          </p>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/70">{t.hero.pitch}</p>

          <div className="mt-9 flex flex-wrap gap-3">
            <SectionLink id="reserver" className="btn-gold">
              {t.hero.cta}
            </SectionLink>
            <SectionLink id="services" className="btn-outline">
              {t.hero.ctaSecondary}
            </SectionLink>
          </div>

          <ul className="mt-12 grid gap-4 text-sm text-cream/60 sm:grid-cols-3">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {t.hero.argument1}
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {t.hero.argument2}
            </li>
            <li className="flex items-start gap-2">
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {t.hero.argument3}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
