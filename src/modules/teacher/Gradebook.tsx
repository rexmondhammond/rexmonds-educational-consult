import { useMemo, useState } from "react";
import { Bot, CheckCheck, Download, Printer, Sparkles } from "lucide-react";
import { askOnce, extractJson } from "../../lib/ai";
import { classStats, gradeFor, itemAnalysis, keyPointCoverage, suggestShortScore, type Result } from "../../lib/assessment";
import { useApp } from "../../state/AppContext";
import { useClass } from "../../state/ClassContext";
import { Button, Glass, Modal, Pill, SectionTitle, cx } from "../../components/ui";
import { Histogram, StatCard } from "../../components/charts";
import type { Assessment, Student, Submission } from "../../types";

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export default function Gradebook() {
  const { published, submissions, roster, gradings, resultFor, setGrading } = useClass();
  const { notify } = useApp();
  const [aid, setAid] = useState(published[0]?.id ?? "");
  const [open, setOpen] = useState<{ student: Student; sub: Submission } | null>(null);
  const a = published.find((x) => x.id === aid) ?? published[0];

  const rows = useMemo(() => {
    if (!a) return [];
    return roster.map((st) => {
      const sub = submissions.find((s) => s.assessmentId === a.id && s.studentId === st.id);
      return { student: st, sub, res: sub ? resultFor(a, sub) : null };
    });
  }, [a, roster, submissions, resultFor]);

  const stats = useMemo(() => classStats(rows.filter((r) => r.res).map((r) => r.res!.pct), roster.length), [rows, roster.length]);
  const items = useMemo(() => (a ? itemAnalysis(a, submissions.filter((s) => s.assessmentId === a.id), gradings) : []), [a, submissions, gradings]);
  const pendingRows = rows.filter((r) => r.res && r.res.pendingReview > 0);

  const confirmAll = () => {
    if (!a) return;
    let n = 0;
    for (const r of pendingRows) {
      const manual: Record<string, number> = {};
      r.res!.perQuestion.filter((q) => q.suggested).forEach((q) => { manual[q.question.id] = q.score; n += 1; });
      setGrading(r.sub!.id, { manual });
    }
    notify(`${n} suggested marks confirmed`, "success");
  };

  const exportCsv = () => {
    const head = ["Learner", ...published.map((p) => p.title), "Average %"];
    const lines = [head.map(csvCell).join(",")];
    for (const st of roster) {
      const pcts = published.map((p) => {
        const s = submissions.find((x) => x.assessmentId === p.id && x.studentId === st.id);
        return s ? resultFor(p, s).pct : null;
      });
      const got = pcts.filter((x): x is number => x !== null);
      lines.push([st.name, ...pcts.map((x) => (x === null ? "" : x)), got.length ? Math.round(got.reduce((s, x) => s + x, 0) / got.length) : ""].map(csvCell).join(","));
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = "rexmond-gradebook.csv"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  if (!a) return <p className="text-slate-300">No published assessments yet. Create one in the Assessment Builder.</p>;

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Marking and results" title="Gradebook">
        <Button variant="ghost" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
        <Button variant="ghost" className="no-print" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
      </SectionTitle>

      <div className="no-print flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Assessments">
        {published.map((p) => (
          <button key={p.id} role="tab" aria-selected={p.id === a.id} onClick={() => setAid(p.id)}
            className={cx("min-h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold", p.id === a.id ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-slate-700 text-slate-300 hover:border-slate-500")}>{p.title}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Mean" value={`${stats.mean}%`} hint={`Grade ${gradeFor(stats.mean).grade}`} tone={stats.mean >= 50 ? "emerald" : "red"} />
        <StatCard label="Pass rate" value={`${stats.passRate}%`} tone="cyan" />
        <StatCard label="Submitted" value={`${stats.submitted}/${stats.total}`} />
        <StatCard label="To confirm" value={String(pendingRows.length)} hint="Learners with written answers" tone={pendingRows.length ? "amber" : "emerald"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Glass className="overflow-hidden xl:col-span-2" as="section">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 p-4">
            <h2 className="font-bold text-white">Learner results</h2>
            {pendingRows.length > 0 && <Button variant="teal" onClick={confirmAll}><CheckCheck className="h-4 w-4" /> Confirm all suggested marks</Button>}
          </div>
          <div className="scroll-thin max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-slate-950/95 text-left text-xs uppercase tracking-wider text-slate-400"><tr><th className="p-3">Learner</th><th className="p-3">Score</th><th className="p-3">Grade</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {rows.map(({ student, sub, res }) => {
                  const g = res ? gradeFor(res.pct) : null;
                  return (
                    <tr key={student.id} className="border-t border-slate-800/70">
                      <th scope="row" className="p-3 text-left font-semibold text-slate-100">{student.name}</th>
                      <td className="mono p-3 text-slate-200">{res ? `${res.total}/${res.max} · ${res.pct}%` : "-"}</td>
                      <td className="p-3">{g ? <Pill tone={g.tone}>{g.grade}</Pill> : <span className="text-slate-500">-</span>}</td>
                      <td className="p-3 text-xs">{!res ? <span className="text-slate-500">Not submitted</span> : res.pendingReview > 0 ? <span className="text-amber-300">Needs review</span> : <span className="text-emerald-300">Confirmed</span>}</td>
                      <td className="p-3 text-right">{sub && <Button variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => setOpen({ student, sub })}>Review</Button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Glass>

        <div className="space-y-6">
          <Glass className="space-y-3 p-5" as="section"><h2 className="font-bold text-white">Distribution</h2><Histogram counts={stats.distribution} /></Glass>
          <Glass className="space-y-3 p-5" as="section">
            <h2 className="font-bold text-white">Item analysis</h2>
            <ul className="space-y-3">
              {items.map((it, i) => (
                <li key={it.question.id} className="text-sm">
                  <div className="flex items-start justify-between gap-2"><span className="text-slate-200">Q{i + 1}. {it.question.prompt.slice(0, 54)}{it.question.prompt.length > 54 ? "…" : ""}</span><span className="mono shrink-0 text-xs text-slate-300">{it.pctCorrect}%</span></div>
                  {it.flag && <Pill tone={it.flag === "too-hard" ? "red" : "cyan"} className="mt-1">{it.flag === "too-hard" ? "Review: very hard" : "Very easy"}</Pill>}
                  {it.commonWrong && it.pctCorrect < 70 && <p className="mt-1 text-xs text-slate-400">Common wrong answer ({it.commonWrong.share}% of errors): {it.commonWrong.option}</p>}
                </li>
              ))}
            </ul>
          </Glass>
        </div>
      </div>

      {open && <ReviewModal a={a} student={open.student} sub={open.sub} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ReviewModal({ a, student, sub, onClose }: { a: Assessment; student: Student; sub: Submission; onClose: () => void }) {
  const { resultFor, gradings, setGrading } = useClass();
  const { notify, settings } = useApp();
  const res: Result = resultFor(a, sub);
  const g = gradings[sub.id];
  const [busy, setBusy] = useState<string | null>(null);

  const suggestWithAi = async (qid: string) => {
    const r = res.perQuestion.find((x) => x.question.id === qid);
    if (!r) return;
    setBusy(qid);
    const q = r.question;
    try {
      const reply = await askOnce(
        `Mark this student answer out of ${q.marks}. Question: ${q.prompt}\nMarking points: ${(q.keyPoints ?? []).join("; ")}\nStudent answer: ${typeof r.answer === "string" ? r.answer : ""}\nReturn ONLY JSON: {"score": number (multiples of 0.5, max ${q.marks}), "feedback": "one encouraging sentence naming one improvement"}`,
        "json", settings.level ?? "SHS", a.subject,
      );
      const parsed = extractJson<{ score?: number; feedback?: string }>(reply);
      if (!parsed || typeof parsed.score !== "number") throw new Error("bad reply");
      setGrading(sub.id, { manual: { [qid]: Math.max(0, Math.min(q.marks, Math.round(parsed.score * 2) / 2)) }, comments: { [qid]: String(parsed.feedback ?? "") } });
      notify("AI suggestion applied. Adjust if needed.", "success");
    } catch {
      const text = typeof r.answer === "string" ? r.answer : "";
      setGrading(sub.id, { manual: { [qid]: suggestShortScore(q, text) } });
      notify("AI unavailable, so the key-point suggestion was applied.", "warn");
    } finally {
      setBusy(null);
    }
  };

  const draftFeedback = async () => {
    setBusy("overall");
    try {
      const weak = res.perQuestion.filter((x) => x.score < x.max).map((x) => x.question.topic);
      const text = await askOnce(`Write 2 sentences of feedback for ${student.name.split(" ")[0]}, who scored ${res.pct}% on "${a.title}". Weaker topics: ${[...new Set(weak)].join(", ") || "none"}. One strength, one next step.`, "feedback", settings.level ?? "SHS", a.subject);
      setGrading(sub.id, { feedback: text.trim() });
    } catch {
      setGrading(sub.id, { feedback: `${student.name.split(" ")[0]} scored ${res.pct}%. ${res.pct >= 50 ? "Good effort. Keep practising" : "Please revise"} ${[...new Set(res.perQuestion.filter((x) => x.score < x.max).map((x) => x.question.topic))].slice(0, 2).join(" and ") || "your weaker topics"} and try similar questions."` });
      notify("AI unavailable, so a template comment was used.", "warn");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${student.name}: ${res.pct}% (${gradeFor(res.pct).grade})`}>
      <div className="space-y-4">
        {res.perQuestion.map((r, i) => {
          const q = r.question;
          if (q.type === "mcq") {
            return (
              <div key={q.id} className="rounded-xl border border-slate-800 p-3 text-sm">
                <div className="flex justify-between gap-2"><span className="text-slate-200">Q{i + 1}. {q.prompt}</span><span className={cx("mono shrink-0", r.correct ? "text-emerald-300" : "text-red-300")}>{r.score}/{r.max}</span></div>
                <p className="mt-1 text-xs text-slate-400">Chose: {typeof r.answer === "number" ? q.options?.[r.answer] : "No answer"}{!r.correct && ` · Correct: ${q.options?.[q.correct ?? 0]}`}</p>
              </div>
            );
          }
          const text = typeof r.answer === "string" ? r.answer : "";
          const manual = g?.manual[q.id];
          return (
            <div key={q.id} className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm">
              <p className="text-slate-100">Q{i + 1}. {q.prompt}</p>
              <p className="whitespace-pre-wrap rounded-lg bg-slate-950/60 p-2 text-slate-200">{text || "No answer"}</p>
              <ul className="flex flex-wrap gap-1.5">{(q.keyPoints ?? []).map((k) => <li key={k}><Pill tone={keyPointCoverage(text, [k]) >= 1 ? "emerald" : "slate"}>{keyPointCoverage(text, [k]) >= 1 ? "✓" : "○"} {k}</Pill></li>)}</ul>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-slate-300" htmlFor={`m-${q.id}`}>Mark (max {q.marks})</label>
                <input id={`m-${q.id}`} type="number" step={0.5} min={0} max={q.marks} value={manual ?? r.score}
                  onChange={(e) => setGrading(sub.id, { manual: { [q.id]: Math.max(0, Math.min(q.marks, Number(e.target.value) || 0)) } })} className="mono min-h-11 w-20 rounded-xl border border-slate-700 bg-slate-900 px-2 text-center text-white" />
                {manual === undefined ? <Pill tone="amber">Suggested</Pill> : <Pill tone="emerald">Confirmed</Pill>}
                <Button variant="teal" className="min-h-11" disabled={busy === q.id} onClick={() => void suggestWithAi(q.id)}><Bot className="h-4 w-4" /> {busy === q.id ? "Marking…" : "AI mark"}</Button>
                {manual === undefined && <Button variant="ghost" onClick={() => setGrading(sub.id, { manual: { [q.id]: r.score } })}>Confirm</Button>}
              </div>
              <label className="block"><span className="sr-only">Comment for this answer</span>
                <input value={g?.comments[q.id] ?? ""} onChange={(e) => setGrading(sub.id, { comments: { [q.id]: e.target.value } })} placeholder="Comment for the learner" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500" /></label>
            </div>
          );
        })}
        <label className="block"><span className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-400">Overall feedback
          <button onClick={() => void draftFeedback()} disabled={busy === "overall"} className="inline-flex min-h-8 items-center gap-1 text-cyan-300 hover:text-cyan-200"><Sparkles className="h-3.5 w-3.5" /> {busy === "overall" ? "Drafting…" : "Draft with AI"}</button></span>
          <textarea value={g?.feedback ?? ""} onChange={(e) => setGrading(sub.id, { feedback: e.target.value })} rows={3} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" /></label>
        <Button variant="gold" className="w-full" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
