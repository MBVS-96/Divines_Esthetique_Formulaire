import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export type StepId = "service" | "date" | "time" | "details" | "done";

const ORDER: StepId[] = ["service", "date", "time", "details", "done"];

export function Stepper({ current, atHome }: { current: StepId; atHome: boolean }) {
  const { t } = useI18n();
  // The at-home flow skips the slot grid: service → details → done.
  const steps = atHome ? (["service", "details", "done"] as StepId[]) : ORDER;
  const currentIndex = steps.indexOf(current);

  return (
    <ol className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-widest">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={cn(
                "flex items-center gap-2",
                active ? "text-gold" : done ? "text-cream/60" : "text-cream/25",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold",
                  active
                    ? "border-gold bg-gold text-ink-950"
                    : done
                      ? "border-cream/40 text-cream/60"
                      : "border-cream/20",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {t.booking.steps[step]}
            </span>
            {index < steps.length - 1 && <span className="h-px w-5 bg-ink-600" />}
          </li>
        );
      })}
    </ol>
  );
}
