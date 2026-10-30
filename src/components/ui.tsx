import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Glass({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "aside" }) {
  return <Tag className={cx("glass rounded-2xl", className)}>{children}</Tag>;
}

type Variant = "gold" | "teal" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  gold: "bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-[0_0_24px_-6px_rgba(251,191,36,0.7)]",
  teal: "bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)]",
  ghost: "bg-slate-800/70 text-slate-100 hover:bg-slate-700/80 border border-slate-700",
  danger: "bg-red-500 text-white hover:bg-red-400",
};

export function Button({
  variant = "ghost", className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant], className,
      )}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = "slate", className }: { children: ReactNode; tone?: "slate" | "amber" | "cyan" | "emerald" | "red"; className?: string }) {
  const tones = {
    slate: "bg-slate-800 text-slate-300 border-slate-700",
    amber: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    cyan: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
    emerald: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    red: "bg-red-500/10 text-red-300 border-red-500/30",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mono text-xs uppercase tracking-[0.25em] text-amber-400">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function ProgressRing({
  value, size = 120, stroke = 10, label, sublabel, tone = "amber",
}: { value: number; size?: number; stroke?: number; label: string; sublabel?: string; tone?: "amber" | "cyan" | "emerald" }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = tone === "amber" ? "#fbbf24" : tone === "cyan" ? "#22d3ee" : "#34d399";
  return (
    <figure className="flex flex-col items-center gap-2" role="img" aria-label={`${label}: ${Math.round(clamped)} percent`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - clamped / 100)}
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)", filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        <span className="mono absolute inset-0 flex items-center justify-center text-xl font-bold text-white">{Math.round(clamped)}%</span>
      </div>
      <figcaption className="text-center">
        <span className="block text-sm font-semibold text-slate-100">{label}</span>
        {sublabel && <span className="block text-xs text-slate-400">{sublabel}</span>}
      </figcaption>
    </figure>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6 no-print"
      role="dialog" aria-modal="true" aria-label={title}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Glass className="rise max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7 scroll-thin">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="min-h-11 min-w-11 rounded-xl text-slate-300 hover:bg-slate-800">✕</button>
        </div>
        {children}
      </Glass>
    </div>
  );
}

export const ACCENT: Record<string, string> = {
  amber: "from-amber-400/25 to-amber-600/5 text-amber-300 border-amber-400/30",
  cyan: "from-cyan-400/25 to-cyan-600/5 text-cyan-300 border-cyan-400/30",
  emerald: "from-emerald-400/25 to-emerald-600/5 text-emerald-300 border-emerald-400/30",
  violet: "from-violet-400/25 to-violet-600/5 text-violet-300 border-violet-400/30",
  rose: "from-rose-400/25 to-rose-600/5 text-rose-300 border-rose-400/30",
  sky: "from-sky-400/25 to-sky-600/5 text-sky-300 border-sky-400/30",
};
