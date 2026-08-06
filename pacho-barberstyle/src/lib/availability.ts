import type { AvailabilityRule, BlockedSlot, Booking, Service, Settings } from "./types";
import { daysBetweenKeys, todayKey, weekdayOfKey, zonedToUtc } from "./tz";

interface Interval {
  start: number;
  end: number;
}

const ACTIVE_STATUSES = new Set(["confirmed", "pending"]);

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export interface SlotContext {
  settings: Settings;
  availability: AvailabilityRule[];
  bookings: Booking[];
  blocked: BlockedSlot[];
}

/**
 * Free start times for `service` on `dateKey`, as UTC ISO strings.
 *
 * The barber works alone, so a single busy timeline is enough: any overlap
 * with an active booking (padded by the buffer) or a blocked range removes
 * the candidate slot.
 */
export function computeSlots(
  dateKey: string,
  service: Service,
  ctx: SlotContext,
  now: Date = new Date(),
): string[] {
  const { settings, availability, bookings, blocked } = ctx;

  // The at-home VIP service is a quote request, not a grid selection.
  if (service.atHome) return [];

  const rule = availability.find((r) => r.weekday === weekdayOfKey(dateKey));
  if (!rule || !rule.enabled || rule.closeMinute <= rule.openMinute) return [];

  const daysAhead = daysBetweenKeys(todayKey(settings.timezone), dateKey);
  if (daysAhead < 0 || daysAhead > settings.maxAdvanceDays) return [];

  const earliest = now.getTime() + settings.minNoticeHours * 3_600_000;

  const busy: Interval[] = [
    ...bookings
      .filter((b) => ACTIVE_STATUSES.has(b.status))
      .map((b) => ({
        start: Date.parse(b.startsAt) - settings.bufferMin * 60_000,
        end: Date.parse(b.endsAt) + settings.bufferMin * 60_000,
      })),
    ...blocked.map((b) => ({ start: Date.parse(b.startsAt), end: Date.parse(b.endsAt) })),
  ];

  const slots: string[] = [];
  const lastStart = rule.closeMinute - service.durationMin;

  for (let minute = rule.openMinute; minute <= lastStart; minute += settings.slotStepMin) {
    const start = zonedToUtc(dateKey, minute, settings.timezone);
    const candidate: Interval = {
      start: start.getTime(),
      end: start.getTime() + service.durationMin * 60_000,
    };

    if (candidate.start < earliest) continue;
    if (busy.some((b) => overlaps(candidate, b))) continue;

    slots.push(start.toISOString());
  }

  return slots;
}

/** Whether a specific start time is still bookable — the check done on submit. */
export function isSlotBookable(
  startsAt: string,
  service: Service,
  ctx: SlotContext,
  now: Date = new Date(),
): boolean {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return false;
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: ctx.settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(start);
  return computeSlots(key, service, ctx, now).includes(start.toISOString());
}

/** Date keys, from today, that still have at least one free slot. */
export function findOpenDays(
  service: Service,
  ctx: SlotContext,
  fromKey: string,
  count: number,
  now: Date = new Date(),
): Set<string> {
  const open = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const key = addDays(fromKey, i);
    if (computeSlots(key, service, ctx, now).length > 0) open.add(key);
  }
  return open;
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`;
}
