import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { BUSINESS } from "@/lib/config";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SectionLink } from "./SectionLink";
import { Monogram } from "./Monogram";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { id: "services", key: "services" },
  { id: "vip", key: "vip" },
  { id: "reserver", key: "booking" },
  { id: "contact", key: "contact" },
] as const;

export function Header() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || open ? "border-b border-ink-700 bg-ink-950/95 backdrop-blur" : "bg-transparent",
      )}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <SectionLink id="top" className="flex items-center gap-3">
          <Monogram className="h-9 w-9 shrink-0 text-gold" />
          <span className="h-8 w-px bg-gold/40" aria-hidden />
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl tracking-[0.2em] text-cream">PACHO</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold">
              Barberstyle
            </span>
          </span>
        </SectionLink>

        <nav className="hidden items-center gap-7 md:flex">
          {SECTIONS.map((s) => (
            <SectionLink
              key={s.id}
              id={s.id}
              className="text-xs font-semibold uppercase tracking-widest text-cream/70 transition-colors hover:text-gold"
            >
              {t.nav[s.key]}
            </SectionLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <a href={`tel:${BUSINESS.phone}`} className="btn-outline px-4 py-2 text-xs">
            <Phone className="h-3.5 w-3.5" />
            {BUSINESS.phoneDisplay}
          </a>
          <SectionLink id="reserver" className="btn-gold px-4 py-2 text-xs">
            {t.nav.booking}
          </SectionLink>
        </div>

        <button
          type="button"
          className="text-cream md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t.nav.close : t.nav.menu}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-700 bg-ink-950 md:hidden">
          <nav className="container-x flex flex-col py-4">
            {SECTIONS.map((s) => (
              <SectionLink
                key={s.id}
                id={s.id}
                onNavigate={() => setOpen(false)}
                className="border-b border-ink-800 py-3 text-sm font-semibold uppercase tracking-widest text-cream/80"
              >
                {t.nav[s.key]}
              </SectionLink>
            ))}
            <div className="flex items-center justify-between pt-4">
              <LanguageSwitcher />
              <a href={`tel:${BUSINESS.phone}`} className="btn-outline px-4 py-2 text-xs">
                <Phone className="h-3.5 w-3.5" />
                {BUSINESS.phoneDisplay}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
