import type { Slide } from "../lib/deck";
import { Diagram } from "./Diagram";
import { cx } from "./ui";

const KIND_LABEL: Record<Slide["kind"], string> = {
  title: "Lesson", objectives: "Objectives", hook: "Hook", concept: "Concept", example: "Worked example", diagram: "Diagram",
  activity: "Class activity", check: "Check understanding", mistakes: "Common mistakes", summary: "Summary", homework: "Homework",
};

/** One 16:9 slide. Text scales with the container width, so thumbnails and full screen share one design. */
export function SlideView({ slide, index, total, reveal = true, className }: { slide: Slide; index: number; total: number; reveal?: boolean; className?: string }) {
  const hasVisual = slide.diagram !== "none";
  const isTitle = slide.kind === "title";
  return (
    <div className={cx("relative aspect-video w-full overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white", className)} style={{ containerType: "inline-size" }}>
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(34,211,238,.12),transparent),radial-gradient(50%_50%_at_0%_100%,rgba(251,191,36,.12),transparent)]" aria-hidden />
      <div className={cx("relative flex h-full flex-col p-[4cqw]", isTitle && "justify-center")}>
        <p className="mono text-[1.5cqw] uppercase tracking-[0.25em] text-cyan-300">{KIND_LABEL[slide.kind]}</p>
        <h2 className={cx("font-extrabold leading-tight text-amber-300", isTitle ? "mt-[1.5cqw] text-[6cqw]" : "mt-[1cqw] text-[3.6cqw]")}>{slide.title}</h2>
        <div className={cx("mt-[2cqw] flex min-h-0 flex-1 gap-[3cqw]", isTitle && "flex-none")}>
          <div className="min-w-0 flex-1 space-y-[1.2cqw] overflow-hidden">
            {slide.bullets.length > 0 && (
              <ul className="space-y-[1.2cqw]">
                {slide.bullets.map((b, i) => (
                  <li key={i} className={cx("flex gap-[1.2cqw] leading-snug text-slate-100", isTitle ? "text-[2.4cqw] text-slate-300" : "text-[2.3cqw]")}>
                    {!isTitle && <span className="mt-[0.9cqw] h-[0.9cqw] w-[0.9cqw] shrink-0 rounded-full bg-cyan-300" aria-hidden />}
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {slide.example && (
              <div className="rounded-[1cqw] border border-cyan-400/30 bg-cyan-400/5 p-[1.6cqw] text-[2cqw]">
                <p className="font-bold text-cyan-200">{slide.example.problem}</p>
                <ol className="mono mt-[0.8cqw] list-decimal space-y-[0.5cqw] pl-[2.4cqw] text-[1.8cqw] text-slate-200">{slide.example.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                {reveal && <p className="mono mt-[1cqw] rounded-[0.6cqw] bg-slate-950/70 p-[1cqw] text-[1.9cqw] text-amber-200">Answer: {slide.example.answer}</p>}
              </div>
            )}
            {slide.question && (
              <div className="rounded-[1cqw] border border-amber-400/30 bg-amber-400/5 p-[1.6cqw] text-[2cqw]">
                <p className="font-bold text-amber-200">{slide.question.prompt}</p>
                {slide.question.options && <ol type="A" className="mt-[0.8cqw] list-[upper-alpha] space-y-[0.4cqw] pl-[2.4cqw] text-slate-100">{slide.question.options.map((o, i) => <li key={i}>{o}</li>)}</ol>}
                {reveal && <p className="mono mt-[1cqw] text-[1.8cqw] text-emerald-300">Answer: {slide.question.answer}</p>}
              </div>
            )}
          </div>
          {hasVisual && <div className="aspect-square w-[28cqw] shrink-0 self-center rounded-[1cqw] border border-slate-700 bg-slate-950/60 p-[1cqw]"><Diagram kind={slide.diagram} /></div>}
        </div>
        <p className="mono absolute bottom-[1.5cqw] right-[2.5cqw] text-[1.4cqw] text-slate-500">{index + 1} / {total}</p>
      </div>
    </div>
  );
}
