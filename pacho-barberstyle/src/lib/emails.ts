import type { Booking, EmailPreview, Lang, Service, Settings } from "./types";
import { BUSINESS } from "./config";
import { formatPhone } from "./validation";

/**
 * Email bodies. Kept framework-free and inline-styled so the exact same
 * markup can be reused by the Supabase edge function that talks to Resend.
 */

const COPY = {
  fr: {
    confirmSubject: (ref: string) => `Rendez-vous confirmé — ${ref} — Pacho Barberstyle`,
    hello: (name: string) => `Bonjour ${name},`,
    confirmed: "Votre rendez-vous est confirmé.",
    when: "Quand",
    what: "Prestation",
    where: "Où",
    price: "Tarif",
    onQuote: "Sur devis",
    ref: "Référence",
    cancelIntro: (hours: number) =>
      `Un imprévu ? Vous pouvez annuler gratuitement jusqu'à ${hours}h avant le rendez-vous :`,
    cancelButton: "Annuler mon rendez-vous",
    seeYou: "À très vite,",
    reminderSubject: (time: string) => `Rappel : votre rendez-vous demain à ${time}`,
    reminderBody: "Petit rappel de votre rendez-vous chez Pacho Barberstyle.",
    cancelledSubject: (ref: string) => `Rendez-vous annulé — ${ref}`,
    cancelledBody: "Votre rendez-vous a bien été annulé. Le créneau est de nouveau libre.",
    rebook: "Reprendre rendez-vous",
    vipNote:
      "Il s'agit d'une demande de service VIP à domicile : le tarif vous est communiqué par retour, selon la zone et l'horaire.",
  },
  en: {
    confirmSubject: (ref: string) => `Appointment confirmed — ${ref} — Pacho Barberstyle`,
    hello: (name: string) => `Hello ${name},`,
    confirmed: "Your appointment is confirmed.",
    when: "When",
    what: "Service",
    where: "Where",
    price: "Price",
    onQuote: "On quote",
    ref: "Reference",
    cancelIntro: (hours: number) =>
      `Plans changed? You can cancel free of charge up to ${hours}h before the appointment:`,
    cancelButton: "Cancel my appointment",
    seeYou: "See you soon,",
    reminderSubject: (time: string) => `Reminder: your appointment tomorrow at ${time}`,
    reminderBody: "A quick reminder about your appointment at Pacho Barberstyle.",
    cancelledSubject: (ref: string) => `Appointment cancelled — ${ref}`,
    cancelledBody: "Your appointment has been cancelled. The slot is free again.",
    rebook: "Book again",
    vipNote:
      "This is a VIP at-home request: the price will be sent back to you, based on the area and time.",
  },
  es: {
    confirmSubject: (ref: string) => `Cita confirmada — ${ref} — Pacho Barberstyle`,
    hello: (name: string) => `Hola ${name}:`,
    confirmed: "Tu cita está confirmada.",
    when: "Cuándo",
    what: "Servicio",
    where: "Dónde",
    price: "Precio",
    onQuote: "Presupuesto",
    ref: "Referencia",
    cancelIntro: (hours: number) =>
      `¿Te ha surgido algo? Puedes anular gratis hasta ${hours}h antes de la cita:`,
    cancelButton: "Anular mi cita",
    seeYou: "Hasta pronto:",
    reminderSubject: (time: string) => `Recordatorio: tu cita mañana a las ${time}`,
    reminderBody: "Un recordatorio de tu cita en Pacho Barberstyle.",
    cancelledSubject: (ref: string) => `Cita anulada — ${ref}`,
    cancelledBody: "Tu cita ha sido anulada. La hora vuelve a estar libre.",
    rebook: "Pedir cita de nuevo",
    vipNote:
      "Es una solicitud de servicio VIP a domicilio: el precio se te comunicará por respuesta, según la zona y el horario.",
  },
} satisfies Record<Lang, Record<string, unknown>>;

const DATE_LOCALES: Record<Lang, string> = { fr: "fr-CH", en: "en-GB", es: "es-ES" };

function longDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[lang], {
    timeZone: BUSINESS.timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function shell(inner: string): string {
  return `<div style="margin:0;padding:24px;background:#0a0a0b;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#111113;border:1px solid #26262b;border-radius:10px;overflow:hidden;">
    <div style="padding:24px;border-bottom:2px solid #c9a227;text-align:center;">
      <div style="font-size:22px;letter-spacing:4px;color:#f4efe6;text-transform:uppercase;">Pacho Barberstyle</div>
      <div style="font-size:12px;letter-spacing:2px;color:#c9a227;margin-top:6px;">${BUSINESS.city}</div>
    </div>
    <div style="padding:28px;color:#f4efe6;font-size:15px;line-height:1.6;">${inner}</div>
    <div style="padding:18px 28px;border-top:1px solid #26262b;color:#8b8b93;font-size:12px;line-height:1.6;">
      ${BUSINESS.street}, ${BUSINESS.postalCode} ${BUSINESS.city}<br />
      <a href="tel:${BUSINESS.phone}" style="color:#c9a227;text-decoration:none;">${BUSINESS.phoneDisplay}</a>
    </div>
  </div>
</div>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#8b8b93;font-size:13px;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#f4efe6;font-size:15px;font-weight:600;">${value}</td>
  </tr>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#c9a227;color:#0a0a0b;padding:12px 22px;border-radius:6px;font-weight:700;text-decoration:none;letter-spacing:1px;text-transform:uppercase;font-size:13px;">${label}</a>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface EmailArgs {
  booking: Booking;
  service: Service;
  settings: Settings;
  baseUrl: string;
}

export function customerConfirmationEmail({
  booking,
  service,
  settings,
  baseUrl,
}: EmailArgs): EmailPreview {
  const c = COPY[booking.locale];
  const cancelUrl = `${baseUrl}/annuler?ref=${booking.reference}&token=${booking.cancelToken}`;
  const place = booking.address
    ? escapeHtml(booking.address)
    : `${BUSINESS.street}, ${BUSINESS.postalCode} ${BUSINESS.city}`;
  const price =
    service.showPrice && service.priceChf !== null ? `${service.priceChf} CHF` : c.onQuote;

  const inner = `
    <p style="margin:0 0 16px;">${escapeHtml(c.hello(booking.customerName))}</p>
    <p style="margin:0 0 20px;">${c.confirmed}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
      ${row(c.when, longDateTime(booking.startsAt, booking.locale))}
      ${row(c.what, escapeHtml(service.name[booking.locale]))}
      ${row(c.where, place)}
      ${row(c.price, price)}
      ${row(c.ref, booking.reference)}
    </table>
    ${service.atHome ? `<p style="margin:0 0 20px;color:#c9a227;font-size:14px;">${c.vipNote}</p>` : ""}
    <p style="margin:0 0 14px;font-size:14px;color:#b9b9c0;">${c.cancelIntro(settings.cancelWindowHours)}</p>
    <p style="margin:0 0 22px;">${button(cancelUrl, c.cancelButton)}</p>
    <p style="margin:0;color:#8b8b93;">${c.seeYou}<br /><strong style="color:#f4efe6;">Pacho</strong></p>`;

  return {
    to: booking.customerEmail,
    subject: c.confirmSubject(booking.reference),
    html: shell(inner),
    kind: "customer_confirmation",
    createdAt: new Date().toISOString(),
  };
}

export function barberNotificationEmail({ booking, service }: EmailArgs): EmailPreview {
  const price =
    service.showPrice && service.priceChf !== null ? `${service.priceChf} CHF` : "Sur devis";
  const inner = `
    <p style="margin:0 0 18px;font-size:17px;color:#c9a227;font-weight:700;">
      ${service.atHome ? "Nouvelle demande VIP à domicile" : "Nouveau rendez-vous"}
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${row("Quand", longDateTime(booking.startsAt, "fr"))}
      ${row("Prestation", escapeHtml(service.name.fr))}
      ${row("Durée", `${service.durationMin} min`)}
      ${row("Tarif", price)}
      ${row("Client", escapeHtml(booking.customerName))}
      ${row("Téléphone", `<a href="tel:${booking.customerPhone}" style="color:#c9a227;">${formatPhone(booking.customerPhone)}</a>`)}
      ${row("E-mail", `<a href="mailto:${booking.customerEmail}" style="color:#c9a227;">${escapeHtml(booking.customerEmail)}</a>`)}
      ${booking.address ? row("Adresse", escapeHtml(booking.address)) : ""}
      ${booking.notes ? row("Notes", escapeHtml(booking.notes)) : ""}
      ${row("Référence", booking.reference)}
      ${row("Langue", booking.locale.toUpperCase())}
    </table>`;

  return {
    to: BUSINESS.email,
    subject: `${service.atHome ? "[VIP] " : ""}${longDateTime(booking.startsAt, "fr")} — ${booking.customerName} — ${service.name.fr}`,
    html: shell(inner),
    kind: "barber_notification",
    createdAt: new Date().toISOString(),
  };
}

export function customerCancellationEmail({ booking, baseUrl }: EmailArgs): EmailPreview {
  const c = COPY[booking.locale];
  const inner = `
    <p style="margin:0 0 16px;">${escapeHtml(c.hello(booking.customerName))}</p>
    <p style="margin:0 0 20px;">${c.cancelledBody}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
      ${row(c.when, longDateTime(booking.startsAt, booking.locale))}
      ${row(c.ref, booking.reference)}
    </table>
    <p style="margin:0 0 22px;">${button(baseUrl, c.rebook)}</p>`;

  return {
    to: booking.customerEmail,
    subject: c.cancelledSubject(booking.reference),
    html: shell(inner),
    kind: "customer_cancellation",
    createdAt: new Date().toISOString(),
  };
}

export function reminderEmail({ booking, service, settings, baseUrl }: EmailArgs): EmailPreview {
  const c = COPY[booking.locale];
  const time = new Intl.DateTimeFormat(DATE_LOCALES[booking.locale], {
    timeZone: BUSINESS.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(booking.startsAt));
  const cancelUrl = `${baseUrl}/annuler?ref=${booking.reference}&token=${booking.cancelToken}`;

  const inner = `
    <p style="margin:0 0 16px;">${escapeHtml(c.hello(booking.customerName))}</p>
    <p style="margin:0 0 20px;">${c.reminderBody}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
      ${row(c.when, longDateTime(booking.startsAt, booking.locale))}
      ${row(c.what, escapeHtml(service.name[booking.locale]))}
      ${row(c.ref, booking.reference)}
    </table>
    <p style="margin:0 0 14px;font-size:14px;color:#b9b9c0;">${c.cancelIntro(settings.cancelWindowHours)}</p>
    <p style="margin:0;">${button(cancelUrl, c.cancelButton)}</p>`;

  return {
    to: booking.customerEmail,
    subject: c.reminderSubject(time),
    html: shell(inner),
    kind: "reminder",
    createdAt: new Date().toISOString(),
  };
}
