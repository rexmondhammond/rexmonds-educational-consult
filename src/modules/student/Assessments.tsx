import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Clock, Flag, RotateCcw, Send, XCircle } from "lucide-react";
import { useApp } from "../../state/AppContext";
import { useClass } from "../../state/ClassContext";
import { gradeFor, keyPointCoverage } from "../../lib/assessment";
import { Button, Glass, Pill, ProgressRing, SectionTitle, cx } from "../../components/ui";
import type { Assessment, Submission } from "../../types";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Assessments() {
  const { published, myLatest, resultFor } = useClass();
  const [takingId, setTakingId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const taking = published.find((a) => a.id === takingId);
  const review = published.find((a) => a.id === reviewId);
  const reviewSub = review ? myLatest(review.id) : undefined;

  if (taking) return <Taker a={taking} onDone={() => { setReviewId(taking.id); setTakingId(null); }} onCancel={() => setTakingId(null)} />;
  if (review && reviewSub) return <Review a={review} sub={reviewSub} onBack={() => setReviewId(null)} onRetake={() => { setTakingId(review.id); setReviewId(null); }} />;

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Assessment centre" title="My Assessments">
        <Pill tone="cyan">{published.length} assigned by your teachers</Pill>
      </SectionTitle>
      <p className="max-w-2xl text-sm text-ink-2">Multiple-choice answers are marked instantly. Written answers get a provisional score from key points, then your teacher confirms the final mark.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {published.map((a) => {
          const sub = myLatest(a.id);
          const res = sub ? resultFor(a, sub) : null;
          const g = res ? gradeFor(res.pct) : null;
          const marks = a.questions.reduce((n, q) => n + q.marks, 0);
          return (
            <Glass key={a.id} className="flex flex-col gap-4 p-5" as="article">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mono text-[11px] uppercase tracking-widest text-brand-t">{a.subject}</p>
                  <h2 className="mt-1 text-lg font-bold leading-snug text-ink">{a.title}</h2>
                </div>
                {g && res && <div className="text-right"><p className="mono text-2xl font-bold text-ink">{res.pct}%</p><Pill tone={g.tone}>{g.grade}</Pill></div>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-ink-2">
                <Pill><Clock className="h-3 w-3" /> {a.durationMin} min</Pill>
                <Pill>{a.questions.length} questions</Pill>
                <Pill>{marks} marks</Pill>
                {a.source === "teacher" && <Pill tone="amber">New</Pill>}
              </div>
              <div className="mt-auto flex gap-2">
                {sub ? (
                  <>
                    <Button variant="ghost" className="flex-1" onClick={() => setReviewId(a.id)}>View feedback</Button>
                    <Button variant="ghost" onClick={() => setTakingId(a.id)} aria-label="Retake assessment"><RotateCcw className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <Button variant="gold" className="flex-1" onClick={() => setTakingId(a.id)}>Start assessment</Button>
                )}
              </div>
            </Glass>
          );
        })}
      </div>
    </div>
  );
}

function Taker({ a, onDone, onCancel }: { a: Assessment; onDone: () => void; onCancel: () => void }) {
  const { submitMine } = useClass();
  const { notify, celebrate } = useApp();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [left, setLeft] = useState(a.durationMin * 60);
  const started = useRef(Date.now());
  const done = useRef(false);

  const finish = useCallback(
    (auto: boolean) => {
      if (done.current) return;
      done.current = true;
      const sub = submitMine(a.id, answers, Math.round((Date.now() - started.current) / 1000));
      void sub;
      notify(auto ? "Time is up: your answers were submitted." : "Submitted. Great effort!", "success");
      onDone();
    },
    [a.id, answers, notify, onDone, submitMine],
  );

  useEffect(() => {
    const t = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0) finish(true); }, [left, finish]);
  useEffect(() => { void celebrate; }, [celebrate]);

  const q = a.questions[i];
  const answered = Object.keys(answers).filter((k) => answers[k] !== "" && answers[k] !== undefined).length;
  const low = left <= 60;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => { if (answered === 0 || window.confirm("Leave without submitting? Your answers will be lost.")) onCancel(); }}><ArrowLeft className="h-4 w-4" /> Exit</Button>
        <p className={cx("mono rounded-xl border px-3 py-2 text-lg font-bold", low ? "animate-pulse border-bad/60 text-bad-t" : "border-line text-ink")} role="timer" aria-label={`Time left ${fmt(Math.max(0, left))}`}>{fmt(Math.max(0, left))}</p>
      </div>

      <div>
        <div className="mb-2 flex justify-between text-xs text-mute"><span>{a.title}</span><span>{answered}/{a.questions.length} answered</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((i + 1) / a.questions.length) * 100}%` }} /></div>
      </div>

      <Glass className="space-y-5 p-5 sm:p-7" as="section">
        <div className="flex items-center justify-between gap-2">
          <Pill tone="amber">Question {i + 1} of {a.questions.length}</Pill>
          <div className="flex gap-2"><Pill tone="cyan">{q.topic}</Pill><Pill>{q.marks} mark{q.marks > 1 ? "s" : ""}</Pill></div>
        </div>
        <h2 className="text-lg font-bold leading-snug text-ink">{q.prompt}</h2>

        {q.type === "mcq" ? (
          <div className="grid gap-2" role="radiogroup" aria-label="Answer options">
            {q.options?.map((o, idx) => (
              <button key={idx} role="radio" aria-checked={answers[q.id] === idx} onClick={() => setAnswers((s) => ({ ...s, [q.id]: idx }))}
                className={cx("flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition", answers[q.id] === idx ? "border-brand bg-brand/10 text-ink" : "border-line text-ink hover:border-line-strong")}>
                <span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sunken text-xs text-brand-t">{"ABCDEF"[idx]}</span>{o}
              </button>
            ))}
          </div>
        ) : (
          <label className="block">
            <span className="sr-only">Your written answer</span>
            <textarea value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers((s) => ({ ...s, [q.id]: e.target.value }))} rows={6} maxLength={2000}
              placeholder="Write your answer. Show your working and give reasons." className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-sm text-ink placeholder:text-mute" />
          </label>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))} aria-pressed={!!flags[q.id]}><Flag className={cx("h-4 w-4", flags[q.id] && "text-brand-t")} /> {flags[q.id] ? "Flagged" : "Flag for review"}</Button>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            {i < a.questions.length - 1 ? (
              <Button variant="teal" onClick={() => setI(i + 1)}>Next <ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button variant="gold" onClick={() => { const un = a.questions.length - answered; if (un === 0 || window.confirm(`${un} question${un > 1 ? "s are" : " is"} unanswered. Submit anyway?`)) finish(false); }}><Send className="h-4 w-4" /> Submit</Button>
            )}
          </div>
        </div>
      </Glass>

      <nav className="flex flex-wrap gap-2" aria-label="Question navigator">
        {a.questions.map((x, idx) => (
          <button key={x.id} onClick={() => setI(idx)} aria-label={`Go to question ${idx + 1}`} aria-current={idx === i ? "step" : undefined}
            className={cx("mono grid min-h-11 min-w-11 place-items-center rounded-xl border text-sm font-bold", idx === i ? "border-brand text-brand-t" : answers[x.id] !== undefined && answers[x.id] !== "" ? "border-sky-b/50 bg-sky-b/10 text-sky-t" : "border-line text-mute", flags[x.id] && "ring-2 ring-brand/60")}>
            {idx + 1}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Review({ a, sub, onBack, onRetake }: { a: Assessment; sub: Submission; onBack: () => void; onRetake: () => void }) {
  const { resultFor, gradings } = useClass();
  const { askTutor, celebrate } = useApp();
  const teacher = gradings[sub.id];
  const res = useMemo(() => resultFor(a, sub), [a, sub, resultFor]);
  const g = gradeFor(res.pct);
  const fired = useRef(false);
  useEffect(() => { if (!fired.current && res.pct >= 75) { fired.current = true; celebrate(); } }, [res.pct, celebrate]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> All assessments</Button>
      <Glass className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left" as="section">
        <ProgressRing value={res.pct} label="Score" sublabel={`${res.total} / ${res.max} marks`} tone={res.pct >= 50 ? "emerald" : "amber"} />
        <div className="flex-1 space-y-2">
          <p className="mono text-xs uppercase tracking-widest text-brand-t">{a.subject}</p>
          <h1 className="text-2xl font-extrabold text-ink">{a.title}</h1>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start"><Pill tone={g.tone}>Grade {g.grade}: {g.label}</Pill><Pill>Time {fmt(sub.timeSpentSec)}</Pill>{res.pendingReview > 0 && <Pill tone="amber">{res.pendingReview} written answer{res.pendingReview > 1 ? "s" : ""} awaiting teacher</Pill>}</div>
        </div>
        <Button variant="ghost" onClick={onRetake}><RotateCcw className="h-4 w-4" /> Retake</Button>
      </Glass>

      {teacher?.feedback && (
        <Glass className="border-sky-b/30 p-4" as="section"><p className="text-xs font-semibold uppercase tracking-widest text-sky-t">Teacher feedback</p><p className="mt-1 text-sm text-ink">{teacher.feedback}</p></Glass>
      )}

      <ol className="space-y-3">
        {res.perQuestion.map((r, idx) => {
          const q = r.question;
          const full = r.score >= r.max;
          return (
            <li key={q.id}>
              <Glass className="space-y-3 p-4 sm:p-5" as="article">
                <div className="flex items-start gap-3">
                  {full ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-good-t" aria-label="Correct" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad-t" aria-label={r.score > 0 ? "Partly correct" : "Incorrect"} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-mute">Q{idx + 1} · {q.topic}</p>
                    <p className="font-semibold text-ink">{q.prompt}</p>
                  </div>
                  <span className="mono shrink-0 text-sm text-ink">{r.score}/{r.max}</span>
                </div>
                {q.type === "mcq" ? (
                  <div className="space-y-1 text-sm">
                    <p className={cx(r.correct ? "text-good-t" : "text-bad-t")}>Your answer: {typeof r.answer === "number" ? `${"ABCDEF"[r.answer]}. ${q.options?.[r.answer]}` : "No answer"}</p>
                    {!r.correct && <p className="text-good-t">Correct answer: {"ABCDEF"[q.correct ?? 0]}. {q.options?.[q.correct ?? 0]}</p>}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p className="whitespace-pre-wrap rounded-lg bg-canvas/50 p-3 text-ink">{typeof r.answer === "string" && r.answer ? r.answer : "No answer"}</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {(q.keyPoints ?? []).map((k) => {
                        const hit = keyPointCoverage(typeof r.answer === "string" ? r.answer : "", [k]) >= 1;
                        return <li key={k}><Pill tone={hit ? "emerald" : "slate"}>{hit ? "✓" : "○"} {k}</Pill></li>;
                      })}
                    </ul>
                    {r.suggested && <p className="text-xs text-brand-t">Provisional score. Your teacher will confirm the final mark.</p>}
                  </div>
                )}
                {teacher?.comments[q.id] && <p className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm text-ink"><b className="text-brand-t">Teacher: </b>{teacher.comments[q.id]}</p>}
                <p className="rounded-lg border border-sky-b/20 bg-sky-b/5 p-3 text-sm text-ink"><b className="text-sky-t">Why: </b>{q.explanation}</p>
                {!full && (
                  <Button variant="teal" onClick={() => askTutor({ prompt: `I got this question wrong. Teach me how to solve it, then give me a similar one.\n\nQuestion: ${q.prompt}\nMy answer: ${typeof r.answer === "number" ? q.options?.[r.answer] : r.answer}\nModel explanation: ${q.explanation}`, subject: a.subject })}>
                    <Bot className="h-4 w-4" /> Explain with AI
                  </Button>
                )}
              </Glass>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
