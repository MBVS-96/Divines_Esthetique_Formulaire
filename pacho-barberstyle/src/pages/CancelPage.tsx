import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CalendarX2, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getProvider } from "@/lib/data";
import { BUSINESS, DEFAULT_SETTINGS } from "@/lib/config";
import type { Booking, Service } from "@/lib/types";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type State =
  | { kind: "loading" }
  | { kind: "ready"; booking: Booking; service?: Service; tooLate: boolean }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

/** Landing page for the cancellation link inside every confirmation email. */
export function CancelPage() {
  const { t, fill, formatDate, formatTime } = useI18n();
  const [params] = useSearchParams();
  const reference = params.get("ref") ?? "";
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [cancelWindow, setCancelWindow] = useState(DEFAULT_SETTINGS.cancelWindowHours);

  useEffect(() => {
    const provider = getProvider();
    let cancelled = false;

    void (async () => {
      const [result, settings, services] = await Promise.all([
        provider.getBookingByRef(reference, token),
        provider.getSettings(),
        provider.getServices(),
      ]);
      if (cancelled) return;
      setCancelWindow(settings.cancelWindowHours);

      if (!result.ok) {
        setState({
          kind: "error",
          message: result.error === "not_found" ? t.cancel.notFound : t.booking.errors.unknown,
        });
        return;
      }
      if (result.data.status === "cancelled") {
        setState({ kind: "error", message: t.cancel.already });
        return;
      }
      const tooLate =
        Date.parse(result.data.startsAt) - Date.now() < settings.cancelWindowHours * 3_600_000;
      setState({
        kind: "ready",
        booking: result.data,
        service: services.find((s) => s.id === result.data.serviceId),
        tooLate,
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, token]);

  async function confirmCancel() {
    setBusy(true);
    const result = await getProvider().cancelBooking(reference, token);
    setBusy(false);
    setState(
      result.ok
        ? { kind: "cancelled" }
        : { kind: "error", message: t.booking.errors[result.error] },
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-800">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" className="font-display text-lg tracking-[0.25em] text-cream">
            PACHO BARBERSTYLE
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container-x flex flex-1 items-center justify-center py-16">
        <div className="card w-full max-w-lg p-8">
          {state.kind === "loading" && (
            <p className="py-8 text-center text-cream/50">{t.cancel.checking}</p>
          )}

          {state.kind === "error" && (
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-gold" />
              <p className="mt-5 text-cream/80">{state.message}</p>
              <a href={`tel:${BUSINESS.phone}`} className="btn-outline mt-6">
                {BUSINESS.phoneDisplay}
              </a>
            </div>
          )}

          {state.kind === "cancelled" && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-gold" />
              <p className="mt-5 text-cream/80">{t.cancel.done}</p>
              <Link to="/" className="btn-gold mt-6">
                {t.cancel.rebook}
              </Link>
            </div>
          )}

          {state.kind === "ready" && (
            <div>
              <CalendarX2 className="mx-auto h-12 w-12 text-gold" />
              <h1 className="mt-5 text-center font-display text-3xl tracking-wide text-cream">
                {t.cancel.title}
              </h1>

              <div className="mt-6 rounded-md border border-ink-700 bg-ink-950 p-5 text-sm">
                <p className="font-semibold text-cream">
                  {formatDate(new Date(state.booking.startsAt), { weekday: "long" })} {t.common.at}{" "}
                  {formatTime(new Date(state.booking.startsAt))}
                </p>
                <p className="mt-1 text-cream/60">{state.booking.customerName}</p>
                <p className="mt-1 font-mono text-gold">{state.booking.reference}</p>
              </div>

              {state.tooLate ? (
                <p className="mt-6 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-center text-sm text-gold">
                  {fill(t.cancel.late, { hours: cancelWindow })}
                </p>
              ) : (
                <>
                  <p className="mt-6 text-center text-cream/70">{t.cancel.confirmQuestion}</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      className="btn bg-red-600 text-white hover:bg-red-500"
                      disabled={busy}
                      onClick={() => void confirmCancel()}
                    >
                      {t.cancel.confirmButton}
                    </button>
                    <Link to="/" className="btn-ghost">
                      {t.cancel.keep}
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
