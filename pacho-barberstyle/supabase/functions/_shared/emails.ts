/**
 * Email rendering for the edge functions (Deno).
 *
 * KEEP IN SYNC with `src/lib/emails.ts`, which renders the same messages in
 * the browser for the demo preview. The two files are deliberately separate:
 * the frontend bundle and the Deno runtime do not share a module graph.
 */

export type Lang = "fr" | "en" | "es";

export interface BusinessInfo {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  phoneDisplay: string;
  timezone: string;
  siteUrl: string;
}

export interface BookingRow {
  reference: string;
  starts_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string | null;
  notes: string | null;
  locale: Lang;
  cancel_token: string;
}

export interface ServiceRow {
  duration_min: number;
  price_chf: number | null;
  show_price: boolean;
  at_home: boolean;
  name: Record<Lang, string>;
}

const COPY: Record<Lang, Record<string, string>> = {
  fr: {
    hello: "Bonjour",
    confirmed: "Votre rendez-vous est confirmé.",
    when: "Quand",
    what: "Prestation",
    where: "Où",
    price: "Tarif",
    onQuote: "Sur devis",
    ref: "Référence",
    cancelButton: "Annuler mon rendez-vous",
    seeYou: "À très vite,",
    reminderBody: "Petit rappel de votre rendez-vous chez Pacho Barberstyle.",
    cancelledBody: "Votre rendez-vous a bien été annulé. Le créneau est de nouveau libre.",
    rebook: "Reprendre rendez-vous",
    vipNote:
      "Il s'agit d'une demande de service VIP à domicile : le tarif vous est communiqué par retour, selon la zone et l'horaire.",
  },
  en: {
    hello: "Hello",
    confirmed: "Your appointment is confirmed.",
    when: "When",
    what: "Service",
    where: "Where",
    price: "Price",
    onQuote: "On quote",
    ref: "Reference",
    cancelButton: "Cancel my appointment",
    seeYou: "See you soon,",
    reminderBody: "A quick reminder about your appointment at Pacho Barberstyle.",
    cancelledBody: "Your appointment has been cancelled. The slot is free again.",
    rebook: "Book again",
    vipNote:
      "This is a VIP at-home request: the price will be sent back to you, based on the area and time.",
  },
  es: {
    hello: "Hola",
    confirmed: "Tu cita está confirmada.",
    when: "Cuándo",
    what: "Servicio",
    where: "Dónde",
    price: "Precio",
    onQuote: "Presupuesto",
    ref: "Referencia",
    cancelButton: "Anular mi cita",
    seeYou: "Hasta pronto:",
    reminderBody: "Un recordatorio de tu cita en Pacho Barberstyle.",
    cancelledBody: "Tu cita ha sido anulada. La hora vuelve a estar libre.",
    rebook: "Pedir cita de nuevo",
    vipNote:
      "Es una solicitud de servicio VIP a domicilio: el precio se te comunicará por respuesta, según la zona y el horario.",
  },
};

const SUBJECTS: Record<Lang, Record<string, (v: string) => string>> = {
  fr: {
    customer_confirmation: (r) => `Rendez-vous confirmé — ${r} — Pacho Barberstyle`,
    customer_cancellation: (r) => `Rendez-vous annulé — ${r}`,
    reminder: (time) => `Rappel : votre rendez-vous demain à ${time}`,
  },
  en: {
    customer_confirmation: (r) => `Appointment confirmed — ${r} — Pacho Barberstyle`,
    customer_cancellation: (r) => `Appointment cancelled — ${r}`,
    reminder: (time) => `Reminder: your appointment tomorrow at ${time}`,
  },
  es: {
    customer_confirmation: (r) => `Cita confirmada — ${r} — Pacho Barberstyle`,
    customer_cancellation: (r) => `Cita anulada — ${r}`,
    reminder: (time) => `Recordatorio: tu cita mañana a las ${time}`,
  },
};

const DATE_LOCALES: Record<Lang, string> = { fr: "fr-CH", en: "en-GB", es: "es-ES" };

function longDateTime(iso: string, lang: Lang, tz: string): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[lang], {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function shortTime(iso: string, lang: Lang, tz: string): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[lang], {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(inner: string, biz: BusinessInfo): string {
  return `<div style="margin:0;padding:24px;background:#0a0a0b;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#111113;border:1px solid #26262b;border-radius:10px;overflow:hidden;">
    <div style="padding:24px;border-bottom:2px solid #c9a227;text-align:center;">
      <div style="font-size:22px;letter-spacing:4px;color:#f4efe6;text-transform:uppercase;">${escapeHtml(biz.name)}</div>
      <div style="font-size:12px;letter-spacing:2px;color:#c9a227;margin-top:6px;">${escapeHtml(biz.city)}</div>
    </div>
    <div style="padding:28px;color:#f4efe6;font-size:15px;line-height:1.6;">${inner}</div>
    <div style="padding:18px 28px;border-top:1px solid #26262b;color:#8b8b93;font-size:12px;line-height:1.6;">
      ${escapeHtml(biz.street)}, ${escapeHtml(biz.postalCode)} ${escapeHtml(biz.city)}<br />
      <a href="tel:${biz.phone}" style="color:#c9a227;text-decoration:none;">${escapeHtml(biz.phoneDisplay)}</a>
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

export interface Rendered {
  subject: string;
  html: string;
}

export function render(
  kind: string,
  booking: BookingRow,
  service: ServiceRow,
  biz: BusinessInfo,
  cancelWindowHours: number,
): Rendered {
  const lang: Lang = (["fr", "en", "es"] as Lang[]).includes(booking.locale) ? booking.locale : "fr";
  const c = COPY[lang];
  const cancelUrl = `${biz.siteUrl}/annuler?ref=${booking.reference}&token=${booking.cancel_token}`;
  const price =
    service.show_price && service.price_chf !== null ? `${service.price_chf} CHF` : c.onQuote;
  const place = booking.address
    ? escapeHtml(booking.address)
    : `${biz.street}, ${biz.postalCode} ${biz.city}`;

  if (kind === "barber_notification") {
    const inner = `
      <p style="margin:0 0 18px;font-size:17px;color:#c9a227;font-weight:700;">
        ${service.at_home ? "Nouvelle demande VIP à domicile" : "Nouveau rendez-vous"}
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Quand", longDateTime(booking.starts_at, "fr", biz.timezone))}
        ${row("Prestation", escapeHtml(service.name.fr))}
        ${row("Durée", `${service.duration_min} min`)}
        ${row("Tarif", price)}
        ${row("Client", escapeHtml(booking.customer_name))}
        ${row("Téléphone", `<a href="tel:${booking.customer_phone}" style="color:#c9a227;">${escapeHtml(booking.customer_phone)}</a>`)}
        ${row("E-mail", `<a href="mailto:${booking.customer_email}" style="color:#c9a227;">${escapeHtml(booking.customer_email)}</a>`)}
        ${booking.address ? row("Adresse", escapeHtml(booking.address)) : ""}
        ${booking.notes ? row("Notes", escapeHtml(booking.notes)) : ""}
        ${row("Référence", booking.reference)}
        ${row("Langue", lang.toUpperCase())}
      </table>`;
    return {
      subject: `${service.at_home ? "[VIP] " : ""}${longDateTime(booking.starts_at, "fr", biz.timezone)} — ${booking.customer_name} — ${service.name.fr}`,
      html: shell(inner, biz),
    };
  }

  if (kind === "customer_cancellation") {
    const inner = `
      <p style="margin:0 0 16px;">${c.hello} ${escapeHtml(booking.customer_name)},</p>
      <p style="margin:0 0 20px;">${c.cancelledBody}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
        ${row(c.when, longDateTime(booking.starts_at, lang, biz.timezone))}
        ${row(c.ref, booking.reference)}
      </table>
      <p style="margin:0;">${button(biz.siteUrl, c.rebook)}</p>`;
    return { subject: SUBJECTS[lang].customer_cancellation(booking.reference), html: shell(inner, biz) };
  }

  if (kind === "reminder") {
    const inner = `
      <p style="margin:0 0 16px;">${c.hello} ${escapeHtml(booking.customer_name)},</p>
      <p style="margin:0 0 20px;">${c.reminderBody}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
        ${row(c.when, longDateTime(booking.starts_at, lang, biz.timezone))}
        ${row(c.what, escapeHtml(service.name[lang]))}
        ${row(c.ref, booking.reference)}
      </table>
      <p style="margin:0;">${button(cancelUrl, c.cancelButton)}</p>`;
    return {
      subject: SUBJECTS[lang].reminder(shortTime(booking.starts_at, lang, biz.timezone)),
      html: shell(inner, biz),
    };
  }

  // customer_confirmation
  const inner = `
    <p style="margin:0 0 16px;">${c.hello} ${escapeHtml(booking.customer_name)},</p>
    <p style="margin:0 0 20px;">${c.confirmed}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
      ${row(c.when, longDateTime(booking.starts_at, lang, biz.timezone))}
      ${row(c.what, escapeHtml(service.name[lang]))}
      ${row(c.where, place)}
      ${row(c.price, price)}
      ${row(c.ref, booking.reference)}
    </table>
    ${service.at_home ? `<p style="margin:0 0 20px;color:#c9a227;font-size:14px;">${c.vipNote}</p>` : ""}
    <p style="margin:0 0 14px;font-size:14px;color:#b9b9c0;">${cancelWindowHours}h</p>
    <p style="margin:0 0 22px;">${button(cancelUrl, c.cancelButton)}</p>
    <p style="margin:0;color:#8b8b93;">${c.seeYou}<br /><strong style="color:#f4efe6;">Pacho</strong></p>`;

  return { subject: SUBJECTS[lang].customer_confirmation(booking.reference), html: shell(inner, biz) };
}
