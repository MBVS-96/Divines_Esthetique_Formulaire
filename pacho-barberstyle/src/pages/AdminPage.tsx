import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, CalendarDays, Clock, Lock, Mail, Scissors, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getProvider, isDemoMode } from "@/lib/data";
import { BUSINESS } from "@/lib/config";
import type {
  AvailabilityRule,
  BlockedSlot,
  Booking,
  EmailPreview,
  Service,
} from "@/lib/types";
import { formatPhone } from "@/lib/validation";
import { cn } from "@/lib/cn";

type Tab = "agenda" | "services" | "hours" | "blocked" | "emails";

const SESSION_KEY = "pbs.admin";

export function AdminPage() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [tab, setTab] = useState<Tab>("agenda");

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "agenda", label: t.admin.agenda, icon: <CalendarDays className="h-4 w-4" /> },
    { id: "services", label: t.admin.services, icon: <Scissors className="h-4 w-4" /> },
    { id: "hours", label: t.admin.hours, icon: <Clock className="h-4 w-4" /> },
    { id: "blocked", label: t.admin.blocked, icon: <Ban className="h-4 w-4" /> },
    { id: "emails", label: t.admin.emails, icon: <Mail className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-800">
        <div className="container-x flex h-16 items-center justify-between">
          <div>
            <Link to="/" className="font-display text-lg tracking-[0.25em] text-cream">
              PACHO BARBERSTYLE
            </Link>
            <p className="text-[10px] uppercase tracking-widest text-gold">{t.admin.title}</p>
          </div>
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              setAuthed(false);
            }}
          >
            {t.admin.signOut}
          </button>
        </div>
      </header>

      <div className="container-x py-8">
        <nav className="mb-8 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                tab === item.id
                  ? "border-gold bg-gold text-ink-950"
                  : "border-ink-600 text-cream/60 hover:text-cream",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {tab === "agenda" && <AgendaTab />}
        {tab === "services" && <ServicesTab />}
        {tab === "hours" && <HoursTab />}
        {tab === "blocked" && <BlockedTab />}
        {tab === "emails" && <EmailsTab />}
      </div>
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await getProvider().adminSignIn(password);
    setBusy(false);
    if (!ok) {
      setError(true);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");
    onSuccess();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <Lock className="mx-auto h-10 w-10 text-gold" />
        <h1 className="mt-4 text-center font-display text-2xl tracking-wide text-cream">
          {t.admin.title}
        </h1>
        <label className="mt-6 block">
          <span className="label">{t.admin.password}</span>
          <input
            type="password"
            autoFocus
            className="field"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
          />
        </label>
        {error && <p className="mt-2 text-xs text-red-400">{t.admin.wrongPassword}</p>}
        <button type="submit" className="btn-gold mt-6 w-full" disabled={busy}>
          {t.admin.signIn}
        </button>
        {isDemoMode() && (
          <p className="mt-4 text-center text-[11px] text-cream/40">
            Démo : mot de passe <code className="text-gold">pacho</code>
          </p>
        )}
      </form>
    </div>
  );
}

function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const reload = useCallback(() => {
    void getProvider().getServices().then(setServices);
  }, []);
  useEffect(reload, [reload]);
  return { services, reload };
}

function AgendaTab() {
  const { t, lang, formatDate, formatTime } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { services } = useServices();
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  const reload = useCallback(() => {
    void getProvider().adminListBookings().then(setBookings);
  }, []);
  useEffect(reload, [reload]);

  const now = Date.now();
  const rows = bookings
    .filter((b) => (filter === "upcoming" ? Date.parse(b.startsAt) >= now : Date.parse(b.startsAt) < now))
    .sort((a, b) =>
      filter === "upcoming"
        ? a.startsAt.localeCompare(b.startsAt)
        : b.startsAt.localeCompare(a.startsAt),
    );

  async function cancel(id: string) {
    if (!window.confirm(t.admin.confirmCancel)) return;
    await getProvider().adminSetStatus(id, "cancelled");
    reload();
  }

  return (
    <div>
      <div className="mb-5 flex gap-2">
        {(["upcoming", "past"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-widest",
              filter === key ? "bg-ink-700 text-cream" : "text-cream/40 hover:text-cream",
            )}
          >
            {key === "upcoming" ? t.admin.upcoming : t.admin.past}
          </button>
        ))}
      </div>

      {rows.length === 0 && <p className="text-sm text-cream/40">{t.admin.noBookings}</p>}

      <ul className="space-y-3">
        {rows.map((booking) => {
          const service = services.find((s) => s.id === booking.serviceId);
          return (
            <li
              key={booking.id}
              className={cn(
                "card flex flex-wrap items-center justify-between gap-4 p-4",
                booking.status === "cancelled" && "opacity-40",
              )}
            >
              <div className="min-w-[190px]">
                <p className="font-display text-xl text-gold">
                  {formatTime(new Date(booking.startsAt))}
                </p>
                <p className="text-xs uppercase tracking-widest text-cream/40">
                  {formatDate(new Date(booking.startsAt), { weekday: "short" })}
                </p>
              </div>

              <div className="min-w-[200px] flex-1">
                <p className="font-semibold text-cream">{booking.customerName}</p>
                <p className="text-sm text-cream/60">
                  {service ? service.name[lang] : booking.serviceId}
                  {booking.address ? ` · ${booking.address}` : ""}
                </p>
                <p className="mt-1 text-xs text-cream/40">
                  <a href={`tel:${booking.customerPhone}`} className="hover:text-gold">
                    {formatPhone(booking.customerPhone)}
                  </a>{" "}
                  ·{" "}
                  <a href={`mailto:${booking.customerEmail}`} className="hover:text-gold">
                    {booking.customerEmail}
                  </a>
                </p>
                {booking.notes && <p className="mt-1 text-xs italic text-cream/50">{booking.notes}</p>}
              </div>

              <div className="flex items-center gap-2">
                <StatusPill status={booking.status} />
                <span className="font-mono text-xs text-cream/30">{booking.reference}</span>
                {booking.status !== "cancelled" && (
                  <button
                    type="button"
                    className="rounded border border-ink-600 px-3 py-1.5 text-xs text-cream/60 hover:border-red-500 hover:text-red-400"
                    onClick={() => void cancel(booking.id)}
                  >
                    {t.admin.cancelBooking}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: Booking["status"] }) {
  const styles: Record<Booking["status"], string> = {
    confirmed: "border-emerald-500/50 text-emerald-400",
    pending: "border-gold/50 text-gold",
    cancelled: "border-red-500/50 text-red-400",
    completed: "border-ink-600 text-cream/40",
  };
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function ServicesTab() {
  const { t, lang } = useI18n();
  const { services, reload } = useServices();
  const [saved, setSaved] = useState<string | null>(null);

  async function save(service: Service) {
    await getProvider().adminSaveService(service);
    setSaved(service.id);
    setTimeout(() => setSaved(null), 1500);
    reload();
  }

  return (
    <ul className="space-y-4">
      {services.map((service) => (
        <li key={service.id} className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-display text-xl tracking-wide text-cream">{service.name[lang]}</h3>
            {saved === service.id && <span className="text-xs text-emerald-400">{t.admin.saved}</span>}
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="block">
              <span className="label">CHF</span>
              <input
                type="number"
                min={0}
                step={1}
                className="field"
                value={service.priceChf ?? ""}
                onChange={(e) =>
                  void save({
                    ...service,
                    priceChf: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block">
              <span className="label">Min</span>
              <input
                type="number"
                min={5}
                step={5}
                className="field"
                value={service.durationMin}
                onChange={(e) => void save({ ...service, durationMin: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-end gap-2 pb-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#c9a227]"
                checked={service.showPrice}
                onChange={(e) => void save({ ...service, showPrice: e.target.checked })}
              />
              <span className="text-xs text-cream/70">
                {service.showPrice ? t.admin.priceVisible : t.admin.priceHidden}
              </span>
            </label>
            <label className="flex items-end gap-2 pb-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#c9a227]"
                checked={service.active}
                onChange={(e) => void save({ ...service, active: e.target.checked })}
              />
              <span className="text-xs text-cream/70">{t.admin.activeService}</span>
            </label>
          </div>
        </li>
      ))}
    </ul>
  );
}

const WEEKDAY_KEYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function toTimeValue(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function fromTimeValue(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function HoursTab() {
  const { t } = useI18n();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getProvider().getAvailability().then(setRules);
  }, []);

  function patch(weekday: number, changes: Partial<AvailabilityRule>) {
    setRules((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...changes } : r)));
  }

  async function save() {
    await getProvider().adminSaveAvailability(rules);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="card max-w-2xl p-6">
      <ul className="space-y-3">
        {rules
          .slice()
          .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))
          .map((rule) => (
            <li key={rule.weekday} className="flex flex-wrap items-center gap-4">
              <span className="w-28 text-sm capitalize text-cream/70">
                {WEEKDAY_KEYS[rule.weekday]}
              </span>
              <label className="flex items-center gap-2 text-xs text-cream/60">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#c9a227]"
                  checked={rule.enabled}
                  onChange={(e) => patch(rule.weekday, { enabled: e.target.checked })}
                />
                {rule.enabled ? t.admin.open : t.admin.closed}
              </label>
              <input
                type="time"
                className="field w-32 py-2"
                disabled={!rule.enabled}
                value={toTimeValue(rule.openMinute)}
                onChange={(e) => patch(rule.weekday, { openMinute: fromTimeValue(e.target.value) })}
              />
              <span className="text-cream/30">→</span>
              <input
                type="time"
                className="field w-32 py-2"
                disabled={!rule.enabled}
                value={toTimeValue(rule.closeMinute)}
                onChange={(e) => patch(rule.weekday, { closeMinute: fromTimeValue(e.target.value) })}
              />
            </li>
          ))}
      </ul>

      <div className="mt-6 flex items-center gap-3">
        <button type="button" className="btn-gold" onClick={() => void save()}>
          {t.admin.save}
        </button>
        {saved && <span className="text-xs text-emerald-400">{t.admin.saved}</span>}
      </div>
    </div>
  );
}

function BlockedTab() {
  const { t, formatDate, formatTime } = useI18n();
  const [blocks, setBlocks] = useState<BlockedSlot[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");

  const reload = useCallback(() => {
    void getProvider().getBlocked().then(setBlocks);
  }, []);
  useEffect(reload, [reload]);

  async function add() {
    if (!from || !to) return;
    await getProvider().adminAddBlock(new Date(from).toISOString(), new Date(to).toISOString(), reason);
    setFrom("");
    setTo("");
    setReason("");
    reload();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-cream/50">
          {t.admin.addBlock}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t.admin.from}</span>
            <input
              type="datetime-local"
              className="field"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">{t.admin.to}</span>
            <input
              type="datetime-local"
              className="field"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="label">{t.admin.blockReason}</span>
          <input
            type="text"
            className="field"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button type="button" className="btn-gold mt-5" onClick={() => void add()}>
          {t.admin.save}
        </button>
      </div>

      <ul className="space-y-2">
        {blocks.map((block) => (
          <li key={block.id} className="card flex items-center justify-between gap-4 p-4 text-sm">
            <span className="text-cream/70">
              {formatDate(new Date(block.startsAt))} {formatTime(new Date(block.startsAt))} →{" "}
              {formatDate(new Date(block.endsAt))} {formatTime(new Date(block.endsAt))}
              {block.reason && <span className="text-cream/40"> · {block.reason}</span>}
            </span>
            <button
              type="button"
              className="text-cream/40 hover:text-red-400"
              aria-label={t.admin.delete}
              onClick={async () => {
                await getProvider().adminDeleteBlock(block.id);
                reload();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmailsTab() {
  const { t, formatDate, formatTime } = useI18n();
  const [emails, setEmails] = useState<EmailPreview[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    void getProvider().adminListEmails().then(setEmails);
  }, []);

  return (
    <div className="max-w-3xl">
      {isDemoMode() && (
        <p className="mb-5 rounded-md border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-gold">
          {t.admin.emailsLocalNote}
        </p>
      )}

      {emails.length === 0 && <p className="text-sm text-cream/40">{t.admin.emailsEmpty}</p>}

      <ul className="space-y-3">
        {emails.map((email, index) => (
          <li key={`${email.createdAt}-${index}`} className="card overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
              onClick={() => setOpen(open === index ? null : index)}
            >
              <span>
                <span className="block text-sm font-semibold text-cream">{email.subject}</span>
                <span className="mt-0.5 block text-xs text-cream/40">
                  {email.to} · {email.kind}
                </span>
              </span>
              <span className="whitespace-nowrap text-xs text-cream/30">
                {formatDate(new Date(email.createdAt), { month: "short" })}{" "}
                {formatTime(new Date(email.createdAt))}
              </span>
            </button>
            {open === index && (
              <iframe
                title={email.subject}
                srcDoc={email.html}
                sandbox=""
                className="h-[520px] w-full border-t border-ink-700 bg-white"
              />
            )}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-cream/30">
        {BUSINESS.email} — {t.admin.emails}
      </p>
    </div>
  );
}
