import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Glass({ children, className, as: Tag = "div", role }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "aside"; role?: string }) {
  return <Tag role={role} className={cx("glass rounded-2xl", className)}>{children}</Tag>;
}

type Variant = "gold" | "teal" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  gold: "bg-brand text-on-brand hover:brightness-110 shadow-sm",
  teal: "bg-sky-b text-white hover:brightness-110 shadow-sm",
  ghost: "bg-surface text-ink hover:bg-sunken border border-line",
  danger: "bg-bad text-white hover:brightness-110",
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
    slate: "bg-sunken text-ink-2 border-line",
    amber: "bg-brand/10 text-brand-t border-brand/30",
    cyan: "bg-sky-b/10 text-sky-t border-sky-b/30",
    emerald: "bg-good/10 text-good-t border-good/30",
    red: "bg-bad/10 text-bad-t border-bad/30",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-semibold text-brand-t">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
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
  const color = tone === "amber" ? "var(--c-brand)" : tone === "cyan" ? "var(--c-sky)" : "var(--c-good)";
  return (
    <figure className="flex flex-col items-center gap-2" role="img" aria-label={`${label}: ${Math.round(clamped)} percent`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-sunken)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - clamped / 100)}
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)", filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        <span className="mono absolute inset-0 flex items-center justify-center text-xl font-bold text-ink">{Math.round(clamped)}%</span>
      </div>
      <figcaption className="text-center">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {sublabel && <span className="block text-xs text-mute">{sublabel}</span>}
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
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="min-h-11 min-w-11 rounded-xl text-ink-2 hover:bg-sunken">✕</button>
        </div>
        {children}
      </Glass>
    </div>
  );
}

export const ACCENT: Record<string, string> = {
  amber: "from-brand/15 to-transparent text-brand-t border-brand/30",
  cyan: "from-sky-b/15 to-transparent text-sky-t border-sky-b/30",
  emerald: "from-good/15 to-transparent text-good-t border-good/30",
  violet: "from-violet-500/15 to-transparent text-violet-700 border-violet-500/30",
  rose: "from-rose-500/15 to-transparent text-rose-700 border-rose-500/30",
  sky: "from-sky-500/15 to-transparent text-sky-700 border-sky-500/30",
};
