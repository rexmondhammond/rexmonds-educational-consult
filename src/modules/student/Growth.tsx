import { useMemo } from "react";
import { Award, Flame, Sparkles, Target } from "lucide-react";
import { SUBJECTS } from "../../data/curriculum";
import { TOPICS } from "../../data/cohort";
import { useApp } from "../../state/AppContext";
import { useClass } from "../../state/ClassContext";
import { gradeFor, studentRecommendations, studentTopicMastery, type Reco } from "../../lib/assessment";
import { Button, Glass, Pill, ProgressRing, SectionTitle, cx } from "../../components/ui";
import { LineTrend, MeterRow, StatCard } from "../../components/charts";

export const TONE_BORDER: Record<Reco["tone"], string> = {
  red: "border-red-400/40 bg-red-500/5",
  amber: "border-amber-400/40 bg-amber-400/5",
  cyan: "border-cyan-400/40 bg-cyan-400/5",
  emerald: "border-emerald-400/40 bg-emerald-400/5",
};

export function RecoCard({ r, onAct }: { r: Reco; onAct: (r: Reco) => void }) {
  return (
    <li className={cx("rounded-xl border p-4", TONE_BORDER[r.tone])}>
      <p className="font-bold text-white">{r.title}</p>
      <p className="mt-1 text-sm text-slate-300">{r.detail}</p>
      {r.action && <Button variant="ghost" className="mt-3" onClick={() => onAct(r)}>{r.action.label}</Button>}
    </li>
  );
}

export function useActOnReco() {
  const { setView, askTutor, role } = useApp();
  return (r: Reco) => {
    const a = r.action;
    if (!a) return;
    if (a.kind === "tutor") askTutor({ prompt: a.prompt ?? r.title, subject: a.subject, mode: role === "teacher" ? "lesson" : "quiz" });
    else if (a.kind === "vault") setView("vault");
    else if (a.kind === "pasco") setView("pasco");
    else if (a.kind === "assessments") setView("assessments");
    else if (a.kind === "build") setView("t-build");
    else if (a.kind === "grades") setView("t-grades");
  };
}

export default function Growth() {
  const { settings, completion, progress, badges } = useApp();
  const { assessments, published, submissions, me, resultFor, gradings } = useClass();
  const act = useActOnReco();

  const mine = useMemo(() => submissions.filter((s) => s.studentId === me.id).sort((a, b) => a.submittedAt - b.submittedAt), [submissions, me.id]);
  const mastery = useMemo(() => studentTopicMastery(me, mine, assessments, gradings), [me, mine, assessments, gradings]);
  const results = useMemo(() => mine.map((s) => ({ sub: s, a: assessments.find((x) => x.id === s.assessmentId)!, res: resultFor(assessments.find((x) => x.id === s.assessmentId)!, s) })).filter((x) => x.a), [mine, assessments, resultFor]);
  const avg = results.length ? Math.round(results.reduce((n, r) => n + r.res.pct, 0) / results.length) : 0;
  const pending = published.length - mine.length;
  const recos = useMemo(() => studentRecommendations(mastery, pending, 0), [mastery, pending]);
  const assessed = TOPICS.filter((t) => mastery[t]?.evidence);
  const chaptersDone = progress.completedChapters.length;
  const totalChapters = SUBJECTS.reduce((n, s) => n + s.chapters.length, 0);

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Personal analytics" title={settings.name ? `${settings.name}'s growth profile` : "Your growth profile"}>
        <Pill tone="amber"><Award className="h-3.5 w-3.5" /> {badges.filter((b) => b.earned).length} badges</Pill>
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Assessments done" value={`${mine.length}/${published.length}`} tone="cyan" />
        <StatCard label="Average score" value={results.length ? `${avg}%` : "-"} hint={results.length ? `Grade ${gradeFor(avg).grade}` : "Take a test to start"} tone={avg >= 50 || !results.length ? "emerald" : "red"} />
        <StatCard label="Chapters completed" value={`${chaptersDone}/${totalChapters}`} hint={`${completion}% of curriculum`} />
        <StatCard label="Topics assessed" value={`${assessed.length}/${TOPICS.length}`} tone="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Glass className="space-y-4 p-5 xl:col-span-2" as="section">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Target className="h-5 w-5 text-amber-400" /> Topic mastery</h2>
          {assessed.length === 0 ? (
            <p className="text-sm text-slate-400">No evidence yet. Complete an assessment and your strengths and gaps will appear here.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {assessed.map((t) => <MeterRow key={t} label={t} pct={mastery[t].pct} />)}
            </div>
          )}
          {TOPICS.filter((t) => !mastery[t]?.evidence).length > 0 && assessed.length > 0 && (
            <p className="text-xs text-slate-400">Not assessed yet: {TOPICS.filter((t) => !mastery[t]?.evidence).join(", ")}</p>
          )}
        </Glass>

        <Glass className="space-y-3 p-5" as="section">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Flame className="h-5 w-5 text-amber-400" /> Score trend</h2>
          <LineTrend points={results.map((r) => r.res.pct)} />
          <div className="flex justify-center"><ProgressRing value={completion} size={96} stroke={9} label="Curriculum" /></div>
        </Glass>
      </div>

      <Glass className="space-y-4 p-5" as="section">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Sparkles className="h-5 w-5 text-cyan-300" /> Recommended for you</h2>
        <ul className="grid gap-3 md:grid-cols-2">{recos.map((r) => <RecoCard key={r.id} r={r} onAct={act} />)}</ul>
      </Glass>

      {results.length > 0 && (
        <Glass className="p-5" as="section">
          <h2 className="mb-3 text-lg font-bold text-white">Results history</h2>
          <ul className="divide-y divide-slate-800">
            {[...results].reverse().map(({ sub, a, res }) => (
              <li key={sub.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0"><span className="block truncate font-semibold text-slate-100">{a.title}</span><span className="text-xs text-slate-400">{a.subject}</span></span>
                <span className="flex shrink-0 items-center gap-2"><span className="mono text-slate-200">{res.pct}%</span><Pill tone={gradeFor(res.pct).tone}>{gradeFor(res.pct).grade}</Pill></span>
              </li>
            ))}
          </ul>
        </Glass>
      )}
    </div>
  );
}
