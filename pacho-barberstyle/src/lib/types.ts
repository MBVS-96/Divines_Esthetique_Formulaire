export type Lang = "fr" | "en" | "es";

export const LANGS: Lang[] = ["fr", "en", "es"];

/** A service offered by the barber. Editable from the admin panel. */
export interface Service {
  id: string;
  slug: string;
  /** Duration in minutes. Drives the slot grid. */
  durationMin: number;
  /** Price in CHF. `null` means "on request" / "sur devis". */
  priceChf: number | null;
  /** When false the price is hidden and replaced by "Prix sur demande". */
  showPrice: boolean;
  /** VIP at-home service: no slot grid, handled as a request. */
  atHome: boolean;
  active: boolean;
  sortOrder: number;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
}

export type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed";

export interface Booking {
  id: string;
  /** Human readable reference shown to the customer, e.g. PB-7K2Q4M. */
  reference: string;
  serviceId: string;
  /** UTC ISO instant. */
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /** Required for the at-home VIP service. */
  address: string | null;
  notes: string | null;
  locale: Lang;
  /** Secret used by the self-service cancellation link. */
  cancelToken: string;
  createdAt: string;
  cancelledAt: string | null;
  reminderSentAt: string | null;
}

/** Weekly opening hours. weekday: 0 = Sunday … 6 = Saturday. */
export interface AvailabilityRule {
  weekday: number;
  /** Minutes from midnight, Europe/Zurich. */
  openMinute: number;
  closeMinute: number;
  enabled: boolean;
}

/** Holidays, breaks, or any manually blocked range. */
export interface BlockedSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

export interface Settings {
  timezone: string;
  /** Granularity of the slot grid, in minutes. */
  slotStepMin: number;
  /** Gap kept between two appointments, in minutes. */
  bufferMin: number;
  /** How soon a salon appointment can be booked. */
  minNoticeHours: number;
  /** How soon an at-home VIP appointment can be requested. */
  vipMinNoticeHours: number;
  /** How far ahead the calendar opens. */
  maxAdvanceDays: number;
  /** Free cancellation window before the appointment. */
  cancelWindowHours: number;
  /** Anti-abuse: active bookings allowed per email or phone number. */
  maxActivePerCustomer: number;
}

export interface BookingInput {
  serviceId: string;
  startsAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address?: string | null;
  notes?: string | null;
  locale: Lang;
  /** Honeypot: must stay empty. Bots fill it in. */
  company?: string;
}

export type BookingError =
  | "slot_taken"
  | "slot_invalid"
  | "too_soon"
  | "too_far"
  | "closed"
  | "invalid_input"
  | "rate_limited"
  | "too_many_active"
  | "bot"
  | "not_found"
  | "already_cancelled"
  | "unknown";

export type Result<T> = { ok: true; data: T } | { ok: false; error: BookingError };

/** Rendered email, so local mode can preview exactly what production sends. */
export interface EmailPreview {
  to: string;
  subject: string;
  html: string;
  kind: "customer_confirmation" | "barber_notification" | "customer_cancellation" | "reminder";
  createdAt: string;
}
