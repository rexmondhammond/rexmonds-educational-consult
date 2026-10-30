import { useMemo, useState } from "react";
import { BookOpenCheck, ClipboardList, Radio, Sparkles, Users } from "lucide-react";
import { TOPICS } from "../../data/cohort";
import { useApp } from "../../state/AppContext";
import { useClass } from "../../state/ClassContext";
import { classStats, gradeFor, itemAnalysis, studentTopicMastery, teacherRecommendations, type ItemStat } from "../../lib/assessment";
import { Glass, Pill, SectionTitle, cx } from "../../components/ui";
import { Histogram, MeterRow, StatCard, toneColor } from "../../components/charts";
import { RecoCard, useActOnReco } from "../student/Growth";

export default function TeacherHome() {
  const { settings, setView, askTutor } = useApp();
  const { published, submissions, roster, gradings, resultFor } = useClass();
  const act = useActOnReco();
  const [selected, setSelected] = useState<string>(published[0]?.id ?? "");

  const data = useMemo(() => {
    const byA = new Map(published.map((a) => [a.id, a]));
    const perSub = submissions.filter((s) => byA.has(s.assessmentId)).map((s) => ({ sub: s, a: byA.get(s.assessmentId)!, res: resultFor(byA.get(s.assessmentId)!, s) }));
    const pending = perSub.reduce((n, x) => n + x.res.pendingReview, 0);
    const students = roster.map((st) => {
      const mine = perSub.filter((x) => x.sub.studentId === st.id).sort((a, b) => a.sub.submittedAt - b.sub.submittedAt);
      const avg = mine.length ? Math.round(mine.reduce((n, x) => n + x.res.pct, 0) / mine.length) : 0;
      const trend = mine.length >= 2 ? mine[mine.length - 1].res.pct - mine[mine.length - 2].res.pct : 0;
      return { student: st, avg, trend, count: mine.length, mastery: studentTopicMastery(st, submissions, published, gradings) };
    });
    const topicAvg = TOPICS.map((t) => ({ topic: t, avg: Math.round(students.reduce((n, s) => n + (s.mastery[t]?.pct ?? 0), 0) / Math.max(1, students.length)) }));
    const flagged: { assessment: string; item: ItemStat }[] = [];
    for (const a of published) {
      itemAnalysis(a, submissions.filter((s) => s.assessmentId === a.id), gradings).filter((i) => i.flag).forEach((item) => flagged.push({ assessment: a.title, item }));
    }
    const allPcts = perSub.map((x) => x.res.pct);
    return { perSub, pending, students, topicAvg, flagged, overall: classStats(allPcts, roster.length) };
  }, [published, submissions, roster, gradings, resultFor]);

  const selA = published.find((a) => a.id === selected) ?? published[0];
  const selStats = useMemo(() => (selA ? classStats(data.perSub.filter((x) => x.a.id === selA.id).map((x) => x.res.pct), roster.length) : null), [data.perSub, selA, roster.length]);
  const recos = useMemo(() => teacherRecommendations(data.topicAvg, data.students.filter((s) => s.count > 0), data.flagged, data.pending), [data]);
  const subRate = Math.round((data.perSub.length / Math.max(1, published.length * roster.length)) * 100);
  const sorted = [...data.students].sort((a, b) => a.avg - b.avg);

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Teacher command center · SHS 2 Science A" title={`Akwaaba, ${settings.name ?? "Teacher"} 👋`}>
        <Pill tone="cyan"><Users className="h-3.5 w-3.5" /> {roster.length} learners</Pill>
      </SectionTitle>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Create assessment", icon: ClipboardList, run: () => setView("t-build"), tone: "text-amber-300" },
          { label: "Open gradebook", icon: BookOpenCheck, run: () => setView("t-grades"), tone: "text-cyan-300" },
          { label: "AI lesson plan", icon: Sparkles, run: () => askTutor({ prompt: "Create a 40-minute NaCCA-aligned lesson plan on solving quadratic equations for SHS 2.", mode: "lesson" }), tone: "text-violet-300" },
          { label: "Go live", icon: Radio, run: () => setView("studio"), tone: "text-red-300" },
        ].map((q) => (
          <button key={q.label} onClick={q.run} className="glass rise flex min-h-20 flex-col items-start justify-between rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400/50">
            <q.icon className={cx("h-6 w-6", q.tone)} /><span className="text-sm font-bold text-white">{q.label}</span>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Class average" value={`${data.overall.mean}%`} hint={`Grade ${gradeFor(data.overall.mean).grade}`} tone={data.overall.mean >= 50 ? "emerald" : "red"} />
        <StatCard label="Pass rate" value={`${data.overall.passRate}%`} hint="Scores of 50% or more" tone="cyan" />
        <StatCard label="Submission rate" value={`${subRate}%`} hint={`${published.length} assessments`} />
        <StatCard label="To confirm" value={String(data.pending)} hint="Written answers" tone={data.pending ? "amber" : "emerald"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Glass className="space-y-3 p-5 xl:col-span-2" as="section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-white">Score distribution</h2>
            <label className="sr-only" htmlFor="home-assess">Assessment</label>
            <select id="home-assess" value={selA?.id ?? ""} onChange={(e) => setSelected(e.target.value)} className="min-h-11 max-w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100">
              {published.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          {selStats && (
            <>
              <Histogram counts={selStats.distribution} />
              <div className="flex flex-wrap gap-2 text-xs">
                <Pill tone="cyan">Mean {selStats.mean}%</Pill><Pill>Median {selStats.median}%</Pill><Pill tone="emerald">High {selStats.highest}%</Pill><Pill tone="red">Low {selStats.lowest}%</Pill><Pill>{selStats.submitted}/{selStats.total} submitted</Pill>
              </div>
            </>
          )}
        </Glass>

        <Glass className="space-y-4 p-5" as="section">
          <h2 className="text-lg font-bold text-white">Class mastery by topic</h2>
          {data.topicAvg.map((t) => <MeterRow key={t.topic} label={t.topic} pct={t.avg} />)}
        </Glass>
      </div>

      <Glass className="space-y-4 p-5" as="section">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Sparkles className="h-5 w-5 text-cyan-300" /> Recommended actions</h2>
        <ul className="grid gap-3 md:grid-cols-2">{recos.map((r) => <RecoCard key={r.id} r={r} onAct={act} />)}</ul>
      </Glass>

      <Glass className="p-5" as="section">
        <h2 className="mb-3 text-lg font-bold text-white">Mastery heatmap</h2>
        <p className="mb-3 text-xs text-slate-400">Learners sorted from most to least support needed. Darker red means a gap to address; green means secure.</p>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr><th scope="col" className="sticky left-0 bg-slate-950/90 p-2 text-left text-slate-400">Learner</th>{TOPICS.map((t) => <th scope="col" key={t} className="p-1 font-semibold text-slate-400">{t.split(" ")[0]}</th>)}<th scope="col" className="p-1 text-slate-400">Avg</th></tr>
            </thead>
            <tbody>
              {sorted.map(({ student, mastery, avg, count }) => (
                <tr key={student.id}>
                  <th scope="row" className="sticky left-0 whitespace-nowrap bg-slate-950/90 p-2 text-left font-semibold text-slate-200">{student.name}</th>
                  {TOPICS.map((t) => {
                    const v = mastery[t]?.pct ?? 0;
                    return <td key={t} className="mono h-9 min-w-10 rounded-md text-center font-bold text-slate-950" style={{ background: toneColor(v), opacity: 0.35 + (v / 100) * 0.65 }} title={`${student.name}, ${t}: ${v}%`}>{v}</td>;
                  })}
                  <td className="mono p-1 text-center font-bold text-white">{count ? `${avg}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Glass>
    </div>
  );
}
