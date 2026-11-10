import { cx } from "./ui";

export const toneColor = (pct: number) => (pct >= 70 ? "var(--c-good)" : pct >= 50 ? "var(--c-gold)" : "var(--c-bad)");

export function StatCard({ label, value, hint, tone = "amber" }: { label: string; value: string; hint?: string; tone?: "amber" | "cyan" | "emerald" | "red" }) {
  const c = { amber: "text-brand-t", cyan: "text-sky-t", emerald: "text-good-t", red: "text-bad-t" }[tone];
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-mute">{label}</p>
      <p className={cx("mono mt-1 text-3xl font-bold", c)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
}

export function MeterRow({ label, pct, note }: { label: string; pct: number; note?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="mono text-xs text-ink-2">{note ?? `${p}%`}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`${label}: ${p} percent`}>
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: toneColor(p), transition: "width .8s cubic-bezier(.34,1.56,.64,1)" }} />
      </div>
    </div>
  );
}

export function Histogram({ counts, passIndex = 5 }: { counts: number[]; passIndex?: number }) {
  const max = Math.max(1, ...counts);
  return (
    <figure role="img" aria-label={`Score distribution: ${counts.map((c, i) => `${i * 10}-${i === 9 ? 100 : i * 10 + 9} percent: ${c}`).join(", ")}`}>
      <div className="flex h-36 items-end gap-1.5">
        {counts.map((c, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="mono text-[10px] text-mute">{c || ""}</span>
            <div className="w-full rounded-t-md" style={{ height: `${(c / max) * 82}%`, minHeight: c ? 6 : 2, background: i >= passIndex ? "var(--c-sky)" : "var(--c-bad)", opacity: c ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {counts.map((_, i) => <span key={i} className="mono flex-1 text-center text-[9px] text-mute">{i * 10}</span>)}
      </div>
    </figure>
  );
}

export function LineTrend({ points, height = 96 }: { points: number[]; height?: number }) {
  if (points.length < 2) return <p className="text-sm text-mute">Complete two or more assessments to see your trend.</p>;
  const w = 320;
  const step = w / (points.length - 1);
  const y = (p: number) => height - 8 - (Math.max(0, Math.min(100, p)) / 100) * (height - 16);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label={`Score trend: ${points.join(", ")} percent`}>
      <line x1="0" x2={w} y1={y(50)} y2={y(50)} stroke="var(--c-line)" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="var(--c-brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={i * step} cy={y(p)} r="4" fill="var(--c-surface)" stroke="var(--c-brand)" strokeWidth="2" />)}
    </svg>
  );
}
