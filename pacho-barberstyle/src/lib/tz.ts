/**
 * Timezone helpers.
 *
 * The salon lives in Europe/Zurich but visitors may sit anywhere, so every
 * slot computation has to be anchored to Geneva wall-clock time rather than to
 * the browser's local time. These helpers convert between the two without
 * pulling in a full timezone library.
 */

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timezone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(timezone, f);
  }
  return f;
}

interface Wall {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Wall-clock fields of `date` as seen in `timezone`. */
export function wallClock(date: Date, timezone: string): Wall {
  const parts = formatter(timezone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Intl renders midnight as hour 24 in some engines.
  const hour = get("hour") % 24;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timezone` from UTC at instant `date`, in milliseconds. */
function offsetMs(date: Date, timezone: string): number {
  const w = wallClock(date, timezone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - date.getTime();
}

/**
 * Turn a Geneva wall-clock date + minutes-from-midnight into a real instant.
 * Two passes so DST transition days resolve correctly.
 */
export function zonedToUtc(dateKey: string, minutesFromMidnight: number, timezone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, 0, 0, 0) + minutesFromMidnight * 60_000;
  let instant = new Date(naive - offsetMs(new Date(naive), timezone));
  instant = new Date(naive - offsetMs(instant, timezone));
  return instant;
}

/** `YYYY-MM-DD` for the given instant in `timezone`. */
export function dateKey(date: Date, timezone: string): string {
  const w = wallClock(date, timezone);
  return `${w.year}-${String(w.month).padStart(2, "0")}-${String(w.day).padStart(2, "0")}`;
}

/** Day of week (0 = Sunday) for the given instant in `timezone`. */
export function weekdayIn(date: Date, timezone: string): number {
  const w = wallClock(date, timezone);
  return new Date(Date.UTC(w.year, w.month - 1, w.day)).getUTCDay();
}

/** Minutes since midnight for the given instant in `timezone`. */
export function minutesIn(date: Date, timezone: string): number {
  const w = wallClock(date, timezone);
  return w.hour * 60 + w.minute;
}

/** `HH:mm`, 24h — the Swiss convention. */
export function formatTime(date: Date, timezone: string): string {
  const w = wallClock(date, timezone);
  return `${String(w.hour).padStart(2, "0")}:${String(w.minute).padStart(2, "0")}`;
}

/** Add days to a `YYYY-MM-DD` key without crossing into timezone maths. */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Weekday index of a `YYYY-MM-DD` key (0 = Sunday). */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function todayKey(timezone: string): string {
  return dateKey(new Date(), timezone);
}

/** Whole days between two date keys (b - a). */
export function daysBetweenKeys(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}
