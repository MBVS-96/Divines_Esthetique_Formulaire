import type { Booking, Service } from "./types";
import { BUSINESS } from "./config";

function stamp(iso: string): string {
  return `${iso.replace(/[-:]/g, "").split(".")[0]}Z`;
}

function escapeIcs(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/** Downloadable .ics so the appointment lands in the customer's calendar. */
export function buildIcs(booking: Booking, service: Service): string {
  const location = booking.address ?? `${BUSINESS.street}, ${BUSINESS.postalCode} ${BUSINESS.city}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pacho Barberstyle//Booking//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.reference}@pachobarberstyle.ch`,
    `DTSTAMP:${stamp(booking.createdAt)}`,
    `DTSTART:${stamp(booking.startsAt)}`,
    `DTEND:${stamp(booking.endsAt)}`,
    `SUMMARY:${escapeIcs(`${service.name[booking.locale]} — ${BUSINESS.name}`)}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs(`${BUSINESS.name} · ${BUSINESS.phoneDisplay} · ${booking.reference}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(BUSINESS.name)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(booking: Booking, service: Service): void {
  const blob = new Blob([buildIcs(booking, service)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${booking.reference}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
