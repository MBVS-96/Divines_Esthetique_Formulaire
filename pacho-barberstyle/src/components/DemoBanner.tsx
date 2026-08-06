import { FlaskConical } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getProvider, isDemoMode } from "@/lib/data";

/** Only rendered while no Supabase credentials are configured. */
export function DemoBanner() {
  const { t } = useI18n();
  if (!isDemoMode()) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-3 border-t border-gold/30 bg-ink-900/95 px-4 py-2 text-center text-xs text-gold backdrop-blur">
      <span className="inline-flex items-center gap-2">
        <FlaskConical className="h-3.5 w-3.5" />
        {t.common.demoBanner}
      </span>
      <button
        type="button"
        className="underline underline-offset-4 hover:text-gold-light"
        onClick={async () => {
          await getProvider().adminReset?.();
          window.location.reload();
        }}
      >
        {t.common.demoReset}
      </button>
    </div>
  );
}
