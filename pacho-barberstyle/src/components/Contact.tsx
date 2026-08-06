import { Clock, Instagram, MapPin, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { BUSINESS, STANDALONE, WHATSAPP_LINK } from "@/lib/config";

export function Contact() {
  const { t } = useI18n();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BUSINESS.mapsQuery)}`;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(BUSINESS.mapsQuery)}&z=16&output=embed`;

  return (
    <section id="contact" className="border-t border-ink-800 bg-ink-900/40 py-20 sm:py-28">
      <div className="container-x">
        <h2 className="font-display text-4xl tracking-widest text-cream sm:text-5xl">
          {t.contact.title}
        </h2>
        <div className="rule mt-8" />

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-7">
            <InfoBlock icon={<MapPin className="h-5 w-5" />} label={t.contact.address}>
              <p className="text-lg text-cream">{BUSINESS.street}</p>
              <p className="text-lg text-cream">
                {BUSINESS.postalCode} {BUSINESS.city}
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-gold underline-offset-4 hover:underline"
              >
                {t.contact.itinerary}
              </a>
            </InfoBlock>

            <InfoBlock icon={<Clock className="h-5 w-5" />} label={t.contact.hours}>
              <p className="text-lg text-cream">{t.contact.hoursValue}</p>
              <p className="mt-1 max-w-sm text-sm text-cream/50">{t.contact.hoursNote}</p>
            </InfoBlock>

            <InfoBlock icon={<Phone className="h-5 w-5" />} label={t.contact.phone}>
              <a href={`tel:${BUSINESS.phone}`} className="text-lg text-cream hover:text-gold">
                {BUSINESS.phoneDisplay}
              </a>
            </InfoBlock>

            <div className="flex flex-wrap gap-3 pt-2">
              <a href={`tel:${BUSINESS.phone}`} className="btn-outline">
                <Phone className="h-4 w-4" />
                {t.contact.call}
              </a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="btn-outline">
                <MessageCircle className="h-4 w-4" />
                {t.contact.whatsapp}
              </a>
              <a
                href={BUSINESS.instagram}
                target="_blank"
                rel="noreferrer"
                className="btn-outline lowercase tracking-wider"
                aria-label={`${t.contact.instagram} — ${BUSINESS.instagramHandle}`}
              >
                <Instagram className="h-4 w-4" />
                {BUSINESS.instagramHandle}
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-ink-700">
            {STANDALONE ? (
              // Third-party embeds are blocked in the single-file demo build.
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-[340px] flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_center,#1a1a1d,#0a0a0b)] text-center lg:h-full lg:min-h-[420px]"
              >
                <MapPin className="h-8 w-8 text-gold" />
                <span className="font-display text-2xl tracking-wide text-cream">
                  {BUSINESS.street}
                </span>
                <span className="text-sm text-cream/50">
                  {BUSINESS.postalCode} {BUSINESS.city}
                </span>
                <span className="mt-2 text-xs uppercase tracking-widest text-gold">
                  {t.contact.itinerary}
                </span>
              </a>
            ) : (
              <iframe
                title={`${BUSINESS.name} — ${BUSINESS.mapsQuery}`}
                src={embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[340px] w-full grayscale-[0.6] contrast-125 lg:h-full lg:min-h-[420px]"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoBlock({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 text-gold">{icon}</span>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-cream/40">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}
