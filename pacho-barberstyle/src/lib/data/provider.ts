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

/**
 * Everything the UI needs from a backend.
 *
 * Two implementations ship with the project: `local` (browser storage, for the
 * demo and for offline development) and `supabase` (production). The UI never
 * imports either one directly — see `data/index.ts`.
 */
export interface DataProvider {
  readonly mode: "local" | "supabase";

  getServices(): Promise<Service[]>;
  getSettings(): Promise<Settings>;
  getAvailability(): Promise<AvailabilityRule[]>;
  getBlocked(): Promise<BlockedSlot[]>;

  /** Free start times (UTC ISO) for a service on a Geneva date. */
  getSlots(dateKey: string, serviceId: string): Promise<string[]>;
  /** Which of the next `days` days still have a free slot. */
  getOpenDays(serviceId: string, fromKey: string, days: number): Promise<string[]>;

  createBooking(input: BookingInput): Promise<Result<Booking>>;
  getBookingByRef(reference: string, token: string): Promise<Result<Booking>>;
  cancelBooking(reference: string, token: string): Promise<Result<Booking>>;

  adminSignIn(password: string): Promise<boolean>;
  adminListBookings(): Promise<Booking[]>;
  adminSetStatus(id: string, status: BookingStatus): Promise<void>;
  adminSaveService(service: Service): Promise<void>;
  adminSaveAvailability(rules: AvailabilityRule[]): Promise<void>;
  adminAddBlock(startsAt: string, endsAt: string, reason: string): Promise<void>;
  adminDeleteBlock(id: string): Promise<void>;
  adminListEmails(): Promise<EmailPreview[]>;
  adminReset?(): Promise<void>;
}
