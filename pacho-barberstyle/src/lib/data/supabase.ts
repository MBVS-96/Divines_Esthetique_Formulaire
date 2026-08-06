import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DataProvider } from "./provider";
import type {
  AvailabilityRule,
  BlockedSlot,
  Booking,
  BookingError,
  BookingInput,
  BookingStatus,
  EmailPreview,
  Result,
  Service,
  Settings,
} from "../types";
import { DEFAULT_SETTINGS } from "../config";

/**
 * Production backend.
 *
 * Every write goes through a SECURITY DEFINER function in Postgres, so the
 * availability rules, the anti-abuse limits and the overlap constraint are
 * enforced by the database rather than by the browser. See
 * `supabase/migrations/0001_init.sql`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapService(row: any): Service {
  return {
    id: row.id,
    slug: row.slug,
    durationMin: row.duration_min,
    priceChf: row.price_chf === null ? null : Number(row.price_chf),
    showPrice: row.show_price,
    atHome: row.at_home,
    active: row.active,
    sortOrder: row.sort_order,
    name: row.name,
    description: row.description,
  };
}

function serviceToRow(service: Service) {
  return {
    id: service.id,
    slug: service.slug,
    duration_min: service.durationMin,
    price_chf: service.priceChf,
    show_price: service.showPrice,
    at_home: service.atHome,
    active: service.active,
    sort_order: service.sortOrder,
    name: service.name,
    description: service.description,
  };
}

function mapBooking(row: any): Booking {
  return {
    id: row.id,
    reference: row.reference,
    serviceId: row.service_id,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    status: row.status,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    address: row.address,
    notes: row.notes,
    locale: row.locale,
    cancelToken: row.cancel_token ?? "",
    createdAt: new Date(row.created_at).toISOString(),
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : null,
    reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at).toISOString() : null,
  };
}

function mapSettings(row: any): Settings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    timezone: row.timezone,
    slotStepMin: row.slot_step_min,
    bufferMin: row.buffer_min,
    minNoticeHours: row.min_notice_hours,
    vipMinNoticeHours: row.vip_min_notice_hours,
    maxAdvanceDays: row.max_advance_days,
    cancelWindowHours: row.cancel_window_hours,
    maxActivePerCustomer: row.max_active_per_customer,
  };
}

const KNOWN_ERRORS = new Set<BookingError>([
  "slot_taken",
  "slot_invalid",
  "too_soon",
  "too_far",
  "closed",
  "invalid_input",
  "rate_limited",
  "too_many_active",
  "bot",
  "not_found",
  "already_cancelled",
]);

function asError(code: unknown): BookingError {
  return KNOWN_ERRORS.has(code as BookingError) ? (code as BookingError) : "unknown";
}

export function createSupabaseProvider(url: string, anonKey: string): DataProvider {
  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  return {
    mode: "supabase",

    async getServices() {
      const { data, error } = await client
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map(mapService);
    },

    async getSettings() {
      // `public_settings` is the view that omits the barber's private fields.
      const { data } = await client.from("public_settings").select("*").limit(1).maybeSingle();
      return mapSettings(data);
    },

    async getAvailability() {
      const { data, error } = await client.from("availability_rules").select("*").order("weekday");
      if (error) throw error;
      return (data ?? []).map(
        (row: any): AvailabilityRule => ({
          weekday: row.weekday,
          openMinute: row.open_minute,
          closeMinute: row.close_minute,
          enabled: row.enabled,
        }),
      );
    },

    async getBlocked() {
      const { data, error } = await client
        .from("blocked_slots")
        .select("*")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;
      return (data ?? []).map(
        (row: any): BlockedSlot => ({
          id: row.id,
          startsAt: new Date(row.starts_at).toISOString(),
          endsAt: new Date(row.ends_at).toISOString(),
          reason: row.reason ?? "",
        }),
      );
    },

    async getSlots(dateKey, serviceId) {
      const { data, error } = await client.rpc("public_get_slots", {
        p_date: dateKey,
        p_service_id: serviceId,
      });
      if (error) throw error;
      return (data ?? []).map((row: any) =>
        new Date(typeof row === "string" ? row : row.slot).toISOString(),
      );
    },

    async getOpenDays(serviceId, fromKey, days) {
      const { data, error } = await client.rpc("public_get_open_days", {
        p_service_id: serviceId,
        p_from: fromKey,
        p_days: days,
      });
      if (error) throw error;
      return (data ?? []).map((row: any) => (typeof row === "string" ? row : row.day));
    },

    async createBooking(input: BookingInput): Promise<Result<Booking>> {
      const { data, error } = await client.rpc("public_create_booking", {
        p_service_id: input.serviceId,
        p_starts_at: input.startsAt,
        p_name: input.customerName,
        p_email: input.customerEmail,
        p_phone: input.customerPhone,
        p_address: input.address ?? null,
        p_notes: input.notes ?? null,
        p_locale: input.locale,
        p_honeypot: input.company ?? "",
      });
      if (error) return { ok: false, error: "unknown" };
      if (!data?.ok) return { ok: false, error: asError(data?.error) };
      return { ok: true, data: mapBooking(data.booking) };
    },

    async getBookingByRef(reference, token) {
      const { data, error } = await client.rpc("public_get_booking", {
        p_reference: reference,
        p_token: token,
      });
      if (error) return { ok: false, error: "unknown" };
      if (!data?.ok) return { ok: false, error: asError(data?.error) };
      return { ok: true, data: mapBooking(data.booking) };
    },

    async cancelBooking(reference, token) {
      const { data, error } = await client.rpc("public_cancel_booking", {
        p_reference: reference,
        p_token: token,
      });
      if (error) return { ok: false, error: "unknown" };
      if (!data?.ok) return { ok: false, error: asError(data?.error) };
      return { ok: true, data: mapBooking(data.booking) };
    },

    async adminSignIn(password) {
      const email = import.meta.env.VITE_ADMIN_EMAIL;
      if (!email) return false;
      const { error } = await client.auth.signInWithPassword({ email, password });
      return !error;
    },

    async adminListBookings() {
      const { data, error } = await client.from("bookings").select("*").order("starts_at");
      if (error) throw error;
      return (data ?? []).map(mapBooking);
    },

    async adminSetStatus(id, status: BookingStatus) {
      const patch: Record<string, unknown> = { status };
      if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
      const { error } = await client.from("bookings").update(patch).eq("id", id);
      if (error) throw error;
    },

    async adminSaveService(service) {
      const { error } = await client.from("services").upsert(serviceToRow(service));
      if (error) throw error;
    },

    async adminSaveAvailability(rules) {
      const { error } = await client.from("availability_rules").upsert(
        rules.map((r) => ({
          weekday: r.weekday,
          open_minute: r.openMinute,
          close_minute: r.closeMinute,
          enabled: r.enabled,
        })),
      );
      if (error) throw error;
    },

    async adminAddBlock(startsAt, endsAt, reason) {
      const { error } = await client
        .from("blocked_slots")
        .insert({ starts_at: startsAt, ends_at: endsAt, reason });
      if (error) throw error;
    },

    async adminDeleteBlock(id) {
      const { error } = await client.from("blocked_slots").delete().eq("id", id);
      if (error) throw error;
    },

    async adminListEmails(): Promise<EmailPreview[]> {
      const { data, error } = await client
        .from("email_outbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        to: row.to_email,
        // Subject and body are filled in by the edge function once sent.
        subject: row.subject ?? `[${row.status}] ${row.kind}`,
        html: row.html ?? "",
        kind: row.kind,
        createdAt: new Date(row.created_at).toISOString(),
      }));
    },
  };
}
