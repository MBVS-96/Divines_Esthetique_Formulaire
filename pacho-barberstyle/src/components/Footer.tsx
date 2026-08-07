import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { BUSINESS } from "@/lib/config";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Monogram } from "./Monogram";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-ink-800 py-10">
      <div className="container-x flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Monogram className="h-8 w-8 shrink-0 text-gold" />
          <div>
            <p className="font-display text-lg tracking-[0.25em] text-cream">
              PACHO BARBERSTYLE
            </p>
            <p className="mt-1 text-xs text-cream/40">
              {BUSINESS.street}, {BUSINESS.postalCode} {BUSINESS.city} ·{" "}
              {t.footer.madeIn}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-cream/40">
          <Link to="/mentions-legales" className="hover:text-gold">
            {t.footer.legal}
          </Link>
          <Link to="/confidentialite" className="hover:text-gold">
            {t.footer.privacy}
          </Link>
          <span>
            © {new Date().getFullYear()} {BUSINESS.name} · {t.footer.rights}
          </span>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
