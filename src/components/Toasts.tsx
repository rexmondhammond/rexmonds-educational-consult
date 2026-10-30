import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useApp } from "../state/AppContext";
import { cx } from "./ui";

const TONES = {
  info: { cls: "border-cyan-400/40", icon: Info, color: "text-cyan-300" },
  success: { cls: "border-emerald-400/40", icon: CheckCircle2, color: "text-emerald-300" },
  warn: { cls: "border-amber-400/40", icon: TriangleAlert, color: "text-amber-300" },
} as const;

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite" role="status">
      {toasts.map((t) => {
        const tone = TONES[t.tone];
        return (
          <div key={t.id} className={cx("glass rise pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-sm text-slate-100", tone.cls)}>
            <tone.icon className={cx("h-5 w-5 shrink-0", tone.color)} />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss notification" className="grid min-h-8 min-w-8 place-items-center rounded-lg text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
