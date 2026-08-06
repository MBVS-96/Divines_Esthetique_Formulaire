import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getProvider } from "@/lib/data";
import { BUSINESS, DEFAULT_SETTINGS } from "@/lib/config";
import type { Booking, BookingError, Service, Settings } from "@/lib/types";
import { todayKey, zonedToUtc } from "@/lib/tz";
import { isValidEmail, isValidName, isValidPhone } from "@/lib/validation";
import { downloadIcs } from "@/lib/ics";
import { Stepper, type StepId } from "./Stepper";
import { DateStrip } from "./DateStrip";
import { TimeGrid } from "./TimeGrid";
import { Field, Honeypot, TextareaField } from "./Field";
import { cn } from "@/lib/cn";

const VISIBLE_DAYS = 21;

interface Props {
  services: Service[];
  selected: Service | null;
  onSelect: (service: Service | null) => void;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  company: string;
  vipTime: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  company: "",
  vipTime: "19:00",
};

export function BookingFlow({ services, selected, onSelect }: Props) {
  const { t, lang, fill, formatDate, formatTime, formatPrice, formatDuration } = useI18n();
  const provider = getProvider();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [step, setStep] = useState<StepId>("service");
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [openDays, setOpenDays] = useState<Set<string> | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<BookingError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const atHome = selected?.atHome ?? false;

  useEffect(() => {
    void provider.getSettings().then(setSettings);
  }, [provider]);

  /** A service chosen from the cards above jumps straight into the flow. */
  useEffect(() => {
    if (!selected) {
      setStep("service");
      return;
    }
    setStep(selected.atHome ? "details" : "date");
    setDateKey(null);
    setSlotIso(null);
    setSlots([]);
    setBooking(null);
    setSubmitError(null);
  }, [selected]);

  /** Grey out days with nothing free, so nobody hunts through empty dates. */
  useEffect(() => {
    if (!selected || selected.atHome) {
      setOpenDays(null);
      return;
    }
    let cancelled = false;
    const from = todayKey(BUSINESS.timezone);
    void provider.getOpenDays(selected.id, from, VISIBLE_DAYS).then((days) => {
      if (!cancelled) setOpenDays(new Set(days));
    });
    return () => {
      cancelled = true;
    };
  }, [provider, selected]);

  useEffect(() => {
    if (!selected || selected.atHome || !dateKey) return;
    let cancelled = false;
    setLoadingSlots(true);
    void provider
      .getSlots(dateKey, selected.id)
      .then((result) => {
        if (cancelled) return;
        setSlots(result);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider, selected, dateKey]);

  const scrollToPanel = useCallback(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const startsAt = useMemo(() => {
    if (!selected) return null;
    if (!atHome) return slotIso;
    if (!dateKey) return null;
    const [h, m] = form.vipTime.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return zonedToUtc(dateKey, h * 60 + m, settings.timezone).toISOString();
  }, [atHome, dateKey, form.vipTime, selected, settings.timezone, slotIso]);

  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!isValidName(form.name)) errors.name = t.booking.errors.invalidName;
    if (!isValidEmail(form.email)) errors.email = t.booking.errors.invalidEmail;
    if (!isValidPhone(form.phone)) errors.phone = t.booking.errors.invalidPhone;
    if (atHome && form.address.trim().length < 10) errors.address = t.booking.errors.invalidAddress;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    if (!selected || !startsAt) return;
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    const result = await provider.createBooking({
      serviceId: selected.id,
      startsAt,
      customerName: form.name,
      customerEmail: form.email,
      customerPhone: form.phone,
      address: atHome ? form.address : null,
      notes: form.notes || null,
      locale: lang,
      company: form.company,
    });
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      // The slot went while the form was open: send them back to pick another.
      if (result.error === "slot_taken" && dateKey && selected) {
        setSlotIso(null);
        setStep("time");
        void provider.getSlots(dateKey, selected.id).then(setSlots);
      }
      return;
    }

    setBooking(result.data);
    setStep("done");
    scrollToPanel();
  }

  function reset() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setSubmitError(null);
    setBooking(null);
    setSlotIso(null);
    setDateKey(null);
    onSelect(null);
  }

  const errorMessage = submitError
    ? fill(t.booking.errors[submitError], {
        hours: atHome ? settings.vipMinNoticeHours : settings.minNoticeHours,
        max: settings.maxActivePerCustomer,
      })
    : null;

  return (
    <section id="reserver" className="border-t border-ink-800 py-20 sm:py-28">
      <div className="container-x">
        <h2 className="font-display text-4xl tracking-widest text-cream sm:text-5xl">
          {t.booking.title}
        </h2>
        <p className="mt-3 text-cream/60">{t.booking.subtitle}</p>
        <div className="rule mt-8" />

        <div ref={panelRef} className="card mt-10 scroll-mt-24 p-6 sm:p-8">
          <Stepper current={step} atHome={atHome} />

          {step === "service" && (
            <div>
              <h3 className="mb-5 font-display text-2xl tracking-wide text-cream">
                {t.booking.chooseService}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onSelect(service)}
                    className="flex items-center justify-between gap-4 rounded-md border border-ink-600 p-4 text-left transition-colors hover:border-gold"
                  >
                    <span>
                      <span className="block font-semibold text-cream">{service.name[lang]}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs uppercase tracking-widest text-cream/40">
                        <Clock className="h-3 w-3" />
                        {formatDuration(service.durationMin)}
                      </span>
                    </span>
                    <span className="whitespace-nowrap font-display text-xl text-gold">
                      {service.showPrice && service.priceChf !== null
                        ? `${formatPrice(service.priceChf)}.−`
                        : t.services.quote}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "date" && selected && (
            <div>
              <SelectedBadge service={selected} onClear={() => onSelect(null)} />
              <h3 className="mb-5 font-display text-2xl tracking-wide text-cream">
                {t.booking.chooseDate}
              </h3>
              <DateStrip
                days={VISIBLE_DAYS}
                openDays={openDays}
                value={dateKey}
                onChange={(key) => {
                  setDateKey(key);
                  setSlotIso(null);
                  setStep("time");
                }}
              />
              <BackButton onClick={() => onSelect(null)} label={t.booking.back} />
            </div>
          )}

          {step === "time" && selected && dateKey && (
            <div>
              <SelectedBadge service={selected} onClear={() => onSelect(null)} />
              <h3 className="mb-1 font-display text-2xl tracking-wide text-cream">
                {t.booking.chooseTime}
              </h3>
              <p className="mb-5 text-sm text-cream/50">
                {formatDate(new Date(`${dateKey}T12:00:00Z`), { weekday: "long" })}
              </p>
              <TimeGrid
                slots={slots}
                loading={loadingSlots}
                value={slotIso}
                onChange={(iso) => {
                  setSlotIso(iso);
                  setStep("details");
                }}
              />
              <BackButton onClick={() => setStep("date")} label={t.booking.back} />
            </div>
          )}

          {step === "details" && selected && (
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <SelectedBadge service={selected} onClear={() => onSelect(null)} />

              {atHome ? (
                <>
                  <h3 className="mb-2 font-display text-2xl tracking-wide text-cream">
                    {t.booking.vipTitle}
                  </h3>
                  <p className="mb-6 max-w-xl text-sm text-cream/60">{t.booking.vipText}</p>
                  <div className="mb-6">
                    <span className="label">{t.booking.chooseDate}</span>
                    <DateStrip
                      days={VISIBLE_DAYS}
                      openDays={null}
                      value={dateKey}
                      onChange={setDateKey}
                    />
                  </div>
                </>
              ) : (
                <h3 className="mb-6 font-display text-2xl tracking-wide text-cream">
                  {t.booking.yourDetails}
                </h3>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label={t.booking.name}
                  required
                  autoComplete="name"
                  placeholder={t.booking.namePlaceholder}
                  value={form.name}
                  error={fieldErrors.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                {atHome && (
                  <Field
                    label={t.booking.preferredTime}
                    required
                    type="time"
                    value={form.vipTime}
                    onChange={(e) => update("vipTime", e.target.value)}
                  />
                )}
                <Field
                  label={t.booking.email}
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={t.booking.emailPlaceholder}
                  help={t.booking.emailHelp}
                  value={form.email}
                  error={fieldErrors.email}
                  onChange={(e) => update("email", e.target.value)}
                />
                <Field
                  label={t.booking.phone}
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t.booking.phonePlaceholder}
                  help={t.booking.phoneHelp}
                  value={form.phone}
                  error={fieldErrors.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>

              {atHome && (
                <div className="mt-5">
                  <TextareaField
                    label={t.booking.address}
                    required
                    placeholder={t.booking.addressPlaceholder}
                    value={form.address}
                    error={fieldErrors.address}
                    onChange={(e) => update("address", e.target.value)}
                  />
                </div>
              )}

              <div className="mt-5">
                <TextareaField
                  label={t.booking.notes}
                  placeholder={t.booking.notesPlaceholder}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                />
              </div>

              <Honeypot value={form.company} onChange={(v) => update("company", v)} />

              <Summary
                service={selected}
                startsAt={startsAt}
                atHome={atHome}
                cancelWindow={settings.cancelWindowHours}
              />

              {errorMessage && (
                <p role="alert" className="mt-5 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {errorMessage}
                </p>
              )}

              <p className="mt-5 text-xs leading-relaxed text-cream/40">{t.booking.consent}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="btn-gold"
                  disabled={submitting || !startsAt || (atHome && !dateKey)}
                >
                  {submitting
                    ? t.booking.submitting
                    : atHome
                      ? t.booking.vipSubmit
                      : t.booking.confirm}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => (atHome ? onSelect(null) : setStep("time"))}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.booking.back}
                </button>
              </div>
            </form>
          )}

          {step === "done" && booking && selected && (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-gold" />
              <h3 className="mt-5 font-display text-3xl tracking-wide text-cream">
                {atHome ? t.booking.vipSuccessTitle : t.booking.successTitle}
              </h3>
              <p className="mx-auto mt-3 max-w-md text-cream/60">
                {fill(atHome ? t.booking.vipSuccessText : t.booking.successText, {
                  email: booking.customerEmail,
                })}
              </p>

              <div className="mx-auto mt-7 max-w-sm rounded-md border border-ink-700 bg-ink-950 p-5 text-left">
                <Row label={t.booking.steps.service} value={selected.name[lang]} />
                <Row
                  label={t.booking.steps.date}
                  value={`${formatDate(new Date(booking.startsAt), { weekday: "long" })} ${t.common.at} ${formatTime(new Date(booking.startsAt))}`}
                />
                <Row label={t.booking.successRef} value={booking.reference} mono />
              </div>

              <p className="mt-4 text-xs text-cream/40">{t.booking.successCancel}</p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => downloadIcs(booking, selected)}
                >
                  <CalendarPlus className="h-4 w-4" />
                  {t.booking.addToCalendar}
                </button>
                <button type="button" className="btn-ghost" onClick={reset}>
                  {t.booking.newBooking}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SelectedBadge({ service, onClear }: { service: Service; onClear: () => void }) {
  const { lang, t, formatDuration } = useI18n();
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold">
        {service.name[lang]}
        <span className="text-gold/60">· {formatDuration(service.durationMin)}</span>
      </span>
      <button type="button" onClick={onClear} className="text-xs uppercase tracking-widest text-cream/40 underline-offset-4 hover:text-cream hover:underline">
        {t.booking.steps.service}
      </button>
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="btn-ghost mt-6 px-0">
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-800 py-2 last:border-0">
      <span className="text-xs uppercase tracking-widest text-cream/40">{label}</span>
      <span className={cn("text-right font-semibold text-cream", mono && "font-mono text-gold")}>
        {value}
      </span>
    </div>
  );
}

function Summary({
  service,
  startsAt,
  atHome,
  cancelWindow,
}: {
  service: Service;
  startsAt: string | null;
  atHome: boolean;
  cancelWindow: number;
}) {
  const { t, lang, fill, formatDate, formatTime, formatPrice, formatDuration } = useI18n();

  return (
    <div className="mt-7 rounded-md border border-ink-700 bg-ink-950 p-5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-cream/40">
        {t.booking.summary}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-cream">{service.name[lang]}</p>
          {startsAt && (
            <p className="mt-1 text-sm text-cream/60">
              {formatDate(new Date(startsAt), { weekday: "long" })} {t.common.at}{" "}
              {formatTime(new Date(startsAt))} · {formatDuration(service.durationMin)}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-cream/40">
            <MapPin className="h-3 w-3" />
            {atHome ? t.vip.point1 : `${BUSINESS.street}, ${BUSINESS.postalCode} ${BUSINESS.city}`}
          </p>
        </div>
        <p className="font-display text-2xl text-gold">
          {service.showPrice && service.priceChf !== null
            ? `${formatPrice(service.priceChf)}.−`
            : t.services.quote}
        </p>
      </div>
      <p className="mt-4 text-xs text-cream/40">{fill(t.booking.free, { hours: cancelWindow })}</p>
    </div>
  );
}
