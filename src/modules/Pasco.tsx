import { useMemo, useState } from "react";
import { Bot, Eye, EyeOff, FileText, GraduationCap, Plus, Printer, Trash2 } from "lucide-react";
import { PASCO, PASCO_NOTICE, PASCO_SUBJECTS } from "../data/pasco";
import { PLACEMENT_NOTICE } from "../data/schools";
import { AGGREGATE_BEST, AGGREGATE_WORST, bandsFor, computeAggregate, placementFor, remarkFor, type Exam, type ScoreEntry } from "../lib/grading";
import { useApp } from "../state/AppContext";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";

type Tab = "pasco" | "placement" | "report";

export default function Pasco() {
  const [tab, setTab] = useState<Tab>("pasco");
  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="BECE & WASSCE" title="Pasco Lab & Placement Hub" />
      <div role="tablist" aria-label="Pasco sections" className="glass inline-flex flex-wrap rounded-xl p-1">
        {([["pasco", "Pasco engine"], ["placement", "Aggregate & placement"], ["report", "Report card"]] as const).map(([id, label]) => (
          <button
            key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cx("min-h-11 rounded-lg px-4 text-sm font-bold", tab === id ? "bg-amber-400 text-slate-950" : "text-slate-300")}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "pasco" && <PascoEngine />}
      {tab === "placement" && <Placement />}
      {tab === "report" && <ReportCard />}
    </div>
  );
}

/* ───────────────────────── Pasco engine ───────────────────────── */

function PascoEngine() {
  const { settings, updateSettings, askTutor } = useApp();
  const [exam, setExam] = useState<Exam>("WASSCE");
  const [subject, setSubject] = useState<string>("All");
  const [year, setYear] = useState<string>("All");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<Record<string, number>>({});

  const subjects = useMemo(() => PASCO_SUBJECTS(exam), [exam]);
  const years = useMemo(
    () => Array.from(new Set(PASCO.filter((q) => q.exam === exam).map((q) => q.year))).sort((a, b) => b - a),
    [exam],
  );
  const list = PASCO.filter((q) => q.exam === exam && (subject === "All" || q.subject === subject) && (year === "All" || q.year === Number(year)));

  const cacheKey = `${exam}`;
  const cached = settings.cachedPasco.includes(cacheKey);

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-400">{PASCO_NOTICE}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Examination" className="glass inline-flex rounded-xl p-1">
          {(["BECE", "WASSCE"] as Exam[]).map((e) => (
            <button key={e} role="tab" aria-selected={exam === e} onClick={() => { setExam(e); setSubject("All"); setYear("All"); }}
              className={cx("min-h-11 rounded-lg px-5 text-sm font-bold", exam === e ? "bg-cyan-400 text-slate-950" : "text-slate-300")}>{e}</button>
          ))}
        </div>
        <label className="text-xs text-slate-400">Subject
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="ml-2 min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
            <option>All</option>{subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">Year
          <select value={year} onChange={(e) => setYear(e.target.value)} className="ml-2 min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
            <option>All</option>{years.map((y) => <option key={y}>{y}</option>)}
          </select>
        </label>
        <Button
          variant={cached ? "teal" : "ghost"} aria-pressed={cached}
          onClick={() => updateSettings({ cachedPasco: cached ? settings.cachedPasco.filter((x) => x !== cacheKey) : [...settings.cachedPasco, cacheKey] })}
        >
          {cached ? `${exam} saved offline` : `Save ${exam} offline`}
        </Button>
      </div>

      <div className="space-y-4">
        {list.map((q) => {
          const open = revealed[q.id];
          const choice = picked[q.id];
          const total = q.marks.M + q.marks.A + q.marks.B;
          return (
            <Glass key={q.id} className="rise space-y-3 p-5" as="article">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="amber">{q.exam} {q.year}</Pill>
                <Pill tone="cyan">{q.subject}</Pill>
                <Pill tone="slate">Q{q.number}</Pill>
                <span className="mono ml-auto text-xs text-slate-400">{total} marks</span>
              </div>
              <p className="text-base font-semibold text-white">{q.question}</p>

              {q.options && (
                <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Options">
                  {q.options.map((o, i) => {
                    const correct = i === q.options!.findIndex((_, idx) => q.solution.startsWith("ABCD"[idx] + "."));
                    return (
                      <button
                        key={o} onClick={() => setPicked((p) => ({ ...p, [q.id]: i }))}
                        className={cx(
                          "min-h-11 rounded-xl border px-3 text-left text-sm",
                          choice === i ? (open ? (correct ? "border-emerald-400 bg-emerald-400/10" : "border-red-400 bg-red-500/10") : "border-amber-400 bg-amber-400/10") : "border-slate-700 hover:border-slate-500",
                          open && correct && "border-emerald-400",
                        )}
                      >
                        <span className="mono mr-2 text-amber-300">{"ABCD"[i]}.</span>{o}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant={open ? "ghost" : "gold"} onClick={() => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }))} aria-expanded={!!open}>
                  {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {open ? "Hide marking scheme" : "Reveal marking scheme"}
                </Button>
                <Button variant="teal" onClick={() => askTutor({ prompt: `Walk me through how to answer this ${q.exam} ${q.subject} ${q.year} question, step by step: ${q.question}`, subject: q.subject })}>
                  <Bot className="h-4 w-4" /> Explain with AI
                </Button>
              </div>

              {open && (
                <div className="rise space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Pill tone="amber">M (Method): {q.marks.M}</Pill>
                    <Pill tone="cyan">A (Accuracy): {q.marks.A}</Pill>
                    <Pill tone="emerald">B (Conceptual): {q.marks.B}</Pill>
                  </div>
                  <ol className="space-y-1.5 text-sm">
                    {q.scheme.map((s) => (
                      <li key={s.label + s.text} className="flex gap-3">
                        <span className={cx("mono w-6 shrink-0 font-bold", s.mark === "M" ? "text-amber-300" : s.mark === "A" ? "text-cyan-300" : "text-emerald-300")}>{s.mark}1</span>
                        <span><span className="font-semibold text-slate-200">{s.label}:</span> <span className="mono text-[13px] text-slate-300">{s.text}</span></span>
                      </li>
                    ))}
                  </ol>
                  <p className="mono rounded-lg bg-slate-900 p-3 text-sm text-amber-200">Solution: {q.solution}</p>
                  <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-slate-200"><b className="text-amber-300">Chief Examiner's comment:</b> {q.examinerComment}</p>
                </div>
              )}
            </Glass>
          );
        })}
        {list.length === 0 && <p className="text-slate-400">No questions match these filters.</p>}
      </div>
    </div>
  );
}

/* ───────────────────────── Shared score state ───────────────────────── */

const DEFAULT_ROWS: Record<Exam, ScoreEntry[]> = {
  BECE: [
    { subject: "English Language", percent: 72, core: true },
    { subject: "Mathematics", percent: 81, core: true },
    { subject: "Integrated Science", percent: 76, core: true },
    { subject: "Social Studies", percent: 68, core: true },
    { subject: "Computing", percent: 85, core: false },
    { subject: "French", percent: 64, core: false },
  ],
  WASSCE: [
    { subject: "English Language", percent: 70, core: true },
    { subject: "Core Mathematics", percent: 78, core: true },
    { subject: "Integrated Science", percent: 72, core: true },
    { subject: "Physics", percent: 80, core: false },
    { subject: "Chemistry", percent: 66, core: false },
    { subject: "Elective Mathematics", percent: 74, core: false },
  ],
};

function ScoreEditor({ exam, rows, setRows }: { exam: Exam; rows: ScoreEntry[]; setRows: (r: ScoreEntry[]) => void }) {
  const update = (i: number, patch: Partial<ScoreEntry>) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_5rem_auto_auto] items-center gap-2 sm:grid-cols-[1fr_6rem_7rem_auto]">
          <input aria-label={`Subject ${i + 1}`} value={r.subject} onChange={(e) => update(i, { subject: e.target.value })}
            className="min-h-11 min-w-0 rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-sm text-white" />
          <input aria-label={`Percent score for ${r.subject}`} type="number" min={0} max={100} value={r.percent}
            onChange={(e) => update(i, { percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            className="mono min-h-11 rounded-xl border border-slate-700 bg-slate-900/80 px-2 text-sm text-white" />
          <button onClick={() => update(i, { core: !r.core })} aria-pressed={r.core}
            className={cx("min-h-11 rounded-xl border px-2 text-xs font-bold", r.core ? "border-amber-400 text-amber-300" : "border-slate-700 text-slate-400")}>
            {r.core ? "Core" : "Elective"}
          </button>
          <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} aria-label={`Remove ${r.subject}`} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-800">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="ghost" onClick={() => setRows([...rows, { subject: `Subject ${rows.length + 1}`, percent: 60, core: false }])} disabled={rows.length >= 12}>
        <Plus className="h-4 w-4" /> Add subject
      </Button>
      <p className="text-xs text-slate-500">{exam === "BECE" ? "BECE counts 4 core + best 2 electives." : "WASSCE placement counts 3 core + best 3 electives."} Grade 1 is best.</p>
    </div>
  );
}

function usePersistedRows() {
  const [exam, setExam] = useState<Exam>("WASSCE");
  const [store, setStore] = useState<Record<Exam, ScoreEntry[]>>(() => {
    try {
      const raw = window.localStorage.getItem("rex.scores.v1");
      if (raw) return { ...DEFAULT_ROWS, ...(JSON.parse(raw) as Partial<Record<Exam, ScoreEntry[]>>) };
    } catch { /* fall back to defaults */ }
    return DEFAULT_ROWS;
  });
  const setRows = (rows: ScoreEntry[]) => {
    const next = { ...store, [exam]: rows };
    setStore(next);
    try { window.localStorage.setItem("rex.scores.v1", JSON.stringify(next)); } catch { /* ignore */ }
  };
  return { exam, setExam, rows: store[exam], setRows };
}

function ExamToggle({ exam, setExam }: { exam: Exam; setExam: (e: Exam) => void }) {
  return (
    <div role="tablist" aria-label="Examination" className="glass inline-flex rounded-xl p-1">
      {(["BECE", "WASSCE"] as Exam[]).map((e) => (
        <button key={e} role="tab" aria-selected={exam === e} onClick={() => setExam(e)}
          className={cx("min-h-11 rounded-lg px-5 text-sm font-bold", exam === e ? "bg-cyan-400 text-slate-950" : "text-slate-300")}>{e}</button>
      ))}
    </div>
  );
}

/* ───────────────────────── Aggregate & placement ───────────────────────── */

function Placement() {
  const { exam, setExam, rows, setRows } = usePersistedRows();
  const result = useMemo(() => computeAggregate(exam, rows), [exam, rows]);
  const placement = useMemo(() => (result.aggregate === null ? null : placementFor(result.aggregate)), [result.aggregate]);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Glass className="space-y-4 p-5" as="section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">CSSPS aggregate calculator</h2>
          <ExamToggle exam={exam} setExam={setExam} />
        </div>
        <ScoreEditor exam={exam} rows={rows} setRows={setRows} />
        <details className="text-xs text-slate-400">
          <summary className="min-h-11 cursor-pointer py-3">Grade scale for {exam}</summary>
          <div className="mono grid grid-cols-3 gap-1">
            {bandsFor(exam).map((b) => <span key={b.label}>{b.label}: {b.min}%+</span>)}
          </div>
        </details>
      </Glass>

      <div className="space-y-5">
        <Glass className="p-5" as="section" >
          <h2 className="mb-3 text-lg font-bold text-white">Your aggregate</h2>
          {result.aggregate === null ? (
            <p role="alert" className="text-sm text-amber-200">{result.warning}</p>
          ) : (
            <div className="flex items-end gap-4">
              <p className="mono text-6xl font-extrabold text-amber-300" aria-label={`Aggregate ${result.aggregate}`}>{result.aggregate}</p>
              <p className="pb-2 text-sm text-slate-400">out of {AGGREGATE_BEST} (best) to {AGGREGATE_WORST} (weakest)</p>
            </div>
          )}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {result.grades.map((g) => (
              <li key={g.subject} className={cx("flex items-center justify-between rounded-xl border p-3 text-sm", g.counted ? "border-amber-400/40 bg-amber-400/5" : "border-slate-800 opacity-60")}>
                <span>{g.subject}<span className="block text-[11px] text-slate-500">{g.core ? "Core" : "Elective"}{g.counted ? " · counted" : ""}</span></span>
                <span className="mono text-lg font-bold text-white">{g.band.label}</span>
              </li>
            ))}
          </ul>
        </Glass>

        {placement && result.aggregate !== null && (
          <Glass className="space-y-4 p-5" as="section">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white"><GraduationCap className="h-5 w-5 text-cyan-300" /> School placement predictor</h2>
            {placement.schools.map((g) => (
              <div key={g.category}>
                <p className="mb-1 text-sm font-bold text-slate-200">Category {g.category}</p>
                {g.list.length ? (
                  <ul className="flex flex-wrap gap-2">{g.list.map((s) => <li key={s.name}><Pill tone={g.category === "A" ? "amber" : g.category === "B" ? "cyan" : "slate"}>{s.name}</Pill></li>)}</ul>
                ) : <p className="text-xs text-slate-500">Outside the indicative band for this category.</p>}
              </div>
            ))}
            <div>
              <p className="mb-1 text-sm font-bold text-slate-200">Tertiary admission outlook</p>
              <ul className="space-y-1 text-sm">
                {placement.universities.eligible.map((u) => <li key={u.name + u.programme} className="text-emerald-300">✓ {u.name}: {u.programme}</li>)}
                {placement.universities.stretch.map((u) => <li key={u.name + u.programme + "s"} className="text-amber-300">~ Stretch: {u.name}: {u.programme}</li>)}
                {placement.universities.eligible.length + placement.universities.stretch.length === 0 && <li className="text-slate-500">No tertiary band reached yet. Improve the weakest grades first.</li>}
              </ul>
            </div>
            <p className="text-xs text-slate-500">{PLACEMENT_NOTICE}</p>
          </Glass>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Report card ───────────────────────── */

function ReportCard() {
  const { exam, setExam, rows, setRows } = usePersistedRows();
  const [name, setName] = useState("Student Name");
  const [school, setSchool] = useState("Your School");
  const result = useMemo(() => computeAggregate(exam, rows), [exam, rows]);
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <Glass className="no-print space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><FileText className="h-5 w-5 text-amber-400" /> Terminal report card</h2>
          <div className="flex gap-2">
            <ExamToggle exam={exam} setExam={setExam} />
            <Button variant="gold" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-400">Student name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-sm text-white" /></label>
          <label className="text-xs text-slate-400">School<input value={school} onChange={(e) => setSchool(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-sm text-white" /></label>
        </div>
        <ScoreEditor exam={exam} rows={rows} setRows={setRows} />
      </Glass>

      <article className="print-sheet glass relative mx-auto max-w-3xl space-y-5 rounded-2xl p-6 sm:p-10" aria-label="Terminal academic report card">
        <header className="flex items-start justify-between gap-4 border-b border-amber-400/40 pb-4">
          <div>
            <p className="mono text-xs uppercase tracking-[0.3em] text-amber-400">Rexmond's Educational Consult</p>
            <h2 className="text-2xl font-extrabold text-white">Terminal Academic Report</h2>
            <p className="text-sm text-slate-400">{exam} performance summary · {date}</p>
          </div>
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-double border-amber-400 text-center text-amber-300" aria-label="Rexmond verification seal">
            <span className="text-[9px] font-extrabold uppercase leading-tight">Rexmond<br />Verified<br />Seal</span>
          </div>
        </header>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">Candidate</dt><dd className="font-bold text-white">{name}</dd></div>
          <div><dt className="text-slate-500">School</dt><dd className="font-bold text-white">{school}</dd></div>
        </dl>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-slate-700 text-xs uppercase text-slate-400"><th className="py-2">Subject</th><th>Score</th><th>Grade</th><th>Remark</th></tr></thead>
          <tbody>
            {result.grades.map((g) => (
              <tr key={g.subject} className="border-b border-slate-800">
                <td className="py-2">{g.subject}{g.counted ? " *" : ""}</td>
                <td className="mono">{g.percent}%</td>
                <td className="mono font-bold text-amber-300">{g.band.label}</td>
                <td className="text-slate-300">{g.band.descriptor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500">* subject counted in the aggregate</p>
        <div className="flex items-center justify-between rounded-xl border border-amber-400/40 bg-amber-400/5 p-4">
          <span className="text-sm font-bold text-white">Aggregate</span>
          <span className="mono text-3xl font-extrabold text-amber-300">{result.aggregate ?? "N/A"}</span>
        </div>
        {result.warning && <p className="text-sm text-amber-200">{result.warning}</p>}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Principal consultant's remarks</h3>
          <p className="mt-1 text-sm text-slate-200">{remarkFor(exam, result.aggregate)}</p>
          <p className="mt-6 border-t border-slate-600 pt-1 text-xs text-slate-500">Principal Consultant, Rexmond's Educational Consult</p>
        </section>
      </article>
    </div>
  );
}
