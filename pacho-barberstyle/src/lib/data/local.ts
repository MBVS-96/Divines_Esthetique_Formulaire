import type { DataProvider } from "./provider";
import type {
  AvailabilityRule,
  BlockedSlot,
  Booking,
  BookingInput,
  BookingStatus,
  EmailPreview,
  Result,
  Service,
  Settings,
} from "../types";
import { DEFAULT_AVAILABILITY, DEFAULT_SERVICES, DEFAULT_SETTINGS, linkBase } from "../config";
import { computeSlots, findOpenDays, isSlotBookable } from "../availability";
import {
  generateReference,
  generateToken,
  isValidEmail,
  isValidName,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} from "../validation";
import {
  barberNotificationEmail,
  customerCancellationEmail,
  customerConfirmationEmail,
} from "../emails";
import { todayKey, zonedToUtc } from "../tz";

/**
 * Browser-storage backend.
 *
 * Behaves exactly like the Supabase one — same validation, same anti-abuse
 * rules, same emails — but keeps everything in localStorage and renders the
 * emails into the admin panel instead of sending them. This is what makes the
 * whole flow testable before any account is created.
 */

const KEY = "pbs.store.v1";
const ADMIN_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD ?? "pacho";

interface Store {
  services: Service[];
  settings: Settings;
  availability: AvailabilityRule[];
  blocked: BlockedSlot[];
  bookings: Booking[];
  emails: EmailPreview[];
  attempts: { at: number }[];
}

function seedBookings(services: Service[], settings: Settings): Booking[] {
  const today = todayKey(settings.timezone);
  const salon = services.filter((s) => !s.atHome);
  const samples = [
    { key: today, minute: 11 * 60, service: salon[2], name: "Marc Rossi" },
    { key: addKey(today, 1), minute: 15 * 60, service: salon[0], name: "Luis Fernández" },
  ];

  return samples.map((s, i) => {
    const start = zonedToUtc(s.key, s.minute, settings.timezone);
    return {
      id: `seed-${i}`,
      reference: `PB-DEMO${i + 1}`,
      serviceId: s.service.id,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + s.service.durationMin * 60_000).toISOString(),
      status: "confirmed" as BookingStatus,
      customerName: s.name,
      customerEmail: "demo@example.ch",
      customerPhone: "+41791112233",
      address: null,
      notes: null,
      locale: "fr" as const,
      cancelToken: generateToken(),
      createdAt: new Date().toISOString(),
      cancelledAt: null,
      reminderSentAt: null,
    };
  });
}

function addKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`;
}

function freshStore(): Store {
  const services = structuredClone(DEFAULT_SERVICES);
  return {
    services,
    settings: { ...DEFAULT_SETTINGS },
    availability: structuredClone(DEFAULT_AVAILABILITY),
    blocked: [],
    bookings: seedBookings(services, DEFAULT_SETTINGS),
    emails: [],
    attempts: [],
  };
}

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const store = freshStore();
      write(store);
      return store;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return freshStore();
  }
}

function write(store: Store): void {
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

function baseUrl(): string {
  return linkBase();
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export function createLocalProvider(): DataProvider {
  const ctx = () => {
    const s = read();
    return {
      store: s,
      slotCtx: {
        settings: s.settings,
        availability: s.availability,
        bookings: s.bookings,
        blocked: s.blocked,
      },
    };
  };

  return {
    mode: "local",

    async getServices() {
      await delay(60);
      return read().services.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
    },

    async getSettings() {
      return read().settings;
    },

    async getAvailability() {
      return read().availability;
    },

    async getBlocked() {
      return read().blocked;
    },

    async getSlots(dateKey, serviceId) {
      await delay(180);
      const { store, slotCtx } = ctx();
      const service = store.services.find((s) => s.id === serviceId);
      if (!service) return [];
      return computeSlots(dateKey, service, slotCtx);
    },

    async getOpenDays(serviceId, fromKey, days) {
      const { store, slotCtx } = ctx();
      const service = store.services.find((s) => s.id === serviceId);
      if (!service) return [];
      return [...findOpenDays(service, slotCtx, fromKey, days)];
    },

    async createBooking(input: BookingInput): Promise<Result<Booking>> {
      await delay(400);
      const store = read();

      // Honeypot: a real browser never fills this in.
      if (input.company && input.company.trim() !== "") {
        return { ok: false, error: "bot" };
      }

      const service = store.services.find((s) => s.id === input.serviceId);
      if (!service || !service.active) return { ok: false, error: "invalid_input" };

      const name = input.customerName.trim();
      const email = normalizeEmail(input.customerEmail);
      const phone = normalizePhone(input.customerPhone);
      if (!isValidName(name) || !isValidEmail(email) || !isValidPhone(input.customerPhone)) {
        return { ok: false, error: "invalid_input" };
      }
      if (service.atHome && (input.address ?? "").trim().length < 10) {
        return { ok: false, error: "invalid_input" };
      }

      // Simple rate limit: 5 submissions per 10 minutes from this browser.
      const now = Date.now();
      const recent = store.attempts.filter((a) => now - a.at < 600_000);
      if (recent.length >= 5) {
        store.attempts = recent;
        write(store);
        return { ok: false, error: "rate_limited" };
      }
      store.attempts = [...recent, { at: now }];

      const active = store.bookings.filter(
        (b) =>
          (b.status === "confirmed" || b.status === "pending") &&
          Date.parse(b.startsAt) > now &&
          (b.customerEmail === email || b.customerPhone === phone),
      );
      if (active.length >= store.settings.maxActivePerCustomer) {
        write(store);
        return { ok: false, error: "too_many_active" };
      }

      const start = new Date(input.startsAt);
      if (Number.isNaN(start.getTime())) return { ok: false, error: "slot_invalid" };

      if (service.atHome) {
        // VIP: no grid, but still refuse anything inside the notice window.
        if (start.getTime() < now + store.settings.vipMinNoticeHours * 3_600_000) {
          write(store);
          return { ok: false, error: "too_soon" };
        }
      } else {
        const slotCtx = {
          settings: store.settings,
          availability: store.availability,
          bookings: store.bookings,
          blocked: store.blocked,
        };
        if (!isSlotBookable(start.toISOString(), service, slotCtx)) {
          write(store);
          return { ok: false, error: "slot_taken" };
        }
      }

      const booking: Booking = {
        id: crypto.randomUUID(),
        reference: generateReference(),
        serviceId: service.id,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + service.durationMin * 60_000).toISOString(),
        // At-home requests wait for Pacho's quote; salon slots confirm instantly.
        status: service.atHome ? "pending" : "confirmed",
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        address: service.atHome ? (input.address ?? "").trim() : null,
        notes: input.notes?.trim() || null,
        locale: input.locale,
        cancelToken: generateToken(),
        createdAt: new Date().toISOString(),
        cancelledAt: null,
        reminderSentAt: null,
      };

      store.bookings.push(booking);
      const args = { booking, service, settings: store.settings, baseUrl: baseUrl() };
      store.emails.unshift(customerConfirmationEmail(args), barberNotificationEmail(args));
      write(store);

      return { ok: true, data: booking };
    },

    async getBookingByRef(reference, token) {
      await delay(150);
      const booking = read().bookings.find(
        (b) => b.reference === reference && b.cancelToken === token,
      );
      if (!booking) return { ok: false, error: "not_found" };
      return { ok: true, data: booking };
    },

    async cancelBooking(reference, token) {
      await delay(300);
      const store = read();
      const booking = store.bookings.find(
        (b) => b.reference === reference && b.cancelToken === token,
      );
      if (!booking) return { ok: false, error: "not_found" };
      if (booking.status === "cancelled") return { ok: false, error: "already_cancelled" };

      booking.status = "cancelled";
      booking.cancelledAt = new Date().toISOString();
      const service = store.services.find((s) => s.id === booking.serviceId)!;
      store.emails.unshift(
        customerCancellationEmail({
          booking,
          service,
          settings: store.settings,
          baseUrl: baseUrl(),
        }),
      );
      write(store);
      return { ok: true, data: booking };
    },

    async adminSignIn(password) {
      await delay(250);
      return password === ADMIN_PASSWORD;
    },

    async adminListBookings() {
      return read().bookings.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    },

    async adminSetStatus(id, status) {
      const store = read();
      const booking = store.bookings.find((b) => b.id === id);
      if (!booking) return;
      booking.status = status;
      if (status === "cancelled") booking.cancelledAt = new Date().toISOString();
      write(store);
    },

    async adminSaveService(service) {
      const store = read();
      const index = store.services.findIndex((s) => s.id === service.id);
      if (index >= 0) store.services[index] = service;
      write(store);
    },

    async adminSaveAvailability(rules) {
      const store = read();
      store.availability = rules;
      write(store);
    },

    async adminAddBlock(startsAt, endsAt, reason) {
      const store = read();
      store.blocked.push({ id: crypto.randomUUID(), startsAt, endsAt, reason });
      write(store);
    },

    async adminDeleteBlock(id) {
      const store = read();
      store.blocked = store.blocked.filter((b) => b.id !== id);
      write(store);
    },

    async adminListEmails() {
      return read().emails;
    },

    async adminReset() {
      window.localStorage.removeItem(KEY);
    },
  };
}
