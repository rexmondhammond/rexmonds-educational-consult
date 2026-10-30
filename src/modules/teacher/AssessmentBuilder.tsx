import { useState } from "react";
import { Eye, Plus, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { SUBJECTS } from "../../data/curriculum";
import { CLASS_NAME, TOPICS } from "../../data/cohort";
import { PASCO } from "../../data/pasco";
import { askOnce, extractJson } from "../../lib/ai";
import { useApp } from "../../state/AppContext";
import { useClass } from "../../state/ClassContext";
import { Button, Glass, Pill, SectionTitle, cx } from "../../components/ui";
import type { AQuestion, Assessment, QType } from "../../types";

const uid = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const blank = (type: QType, topic: string): AQuestion =>
  type === "mcq"
    ? { id: uid(), type, topic, prompt: "", options: ["", "", "", ""], correct: 0, marks: 2, explanation: "" }
    : { id: uid(), type, topic, prompt: "", keyPoints: [], marks: 4, explanation: "" };

const newDraft = (): Assessment => ({
  id: `t-${Date.now().toString(36)}`, title: "", subject: "Core Mathematics", level: "SHS", className: CLASS_NAME, durationMin: 20,
  createdAt: Date.now(), status: "draft", source: "teacher", questions: [],
});

interface RawQ { type?: string; prompt?: string; options?: string[]; correct?: number; keyPoints?: string[]; marks?: number; explanation?: string; topic?: string }

function normalise(raw: RawQ[], topic: string): AQuestion[] {
  const out: AQuestion[] = [];
  for (const r of raw) {
    if (!r || typeof r.prompt !== "string" || !r.prompt.trim()) continue;
    if (r.type === "short" || (!r.options && r.keyPoints)) {
      out.push({ id: uid(), type: "short", topic, prompt: r.prompt.trim(), keyPoints: (r.keyPoints ?? []).map(String).filter(Boolean).slice(0, 8), marks: Math.min(10, Math.max(1, Number(r.marks) || 4)), explanation: String(r.explanation ?? "").trim() });
    } else if (Array.isArray(r.options) && r.options.length >= 2) {
      const options = r.options.map(String).slice(0, 5);
      const correct = Number.isInteger(r.correct) && (r.correct as number) >= 0 && (r.correct as number) < options.length ? (r.correct as number) : 0;
      out.push({ id: uid(), type: "mcq", topic, prompt: r.prompt.trim(), options, correct, marks: Math.min(5, Math.max(1, Number(r.marks) || 2)), explanation: String(r.explanation ?? "").trim() });
    }
  }
  return out;
}

/** Offline fallback: reuse past-question MCQs so the builder still works without the AI service. */
function offlineQuestions(subject: string, topic: string, count: number): AQuestion[] {
  const pool = PASCO.filter((p) => p.options && p.options.length >= 2);
  const same = pool.filter((p) => subject.toLowerCase().includes(p.subject.toLowerCase().split(" ")[0]));
  return (same.length ? same : pool).slice(0, count).map((p) => {
    const idx = p.options!.findIndex((_, i) => p.solution.startsWith(`${"ABCD"[i]}.`));
    return { id: uid(), type: "mcq" as const, topic, prompt: p.question, options: p.options, correct: Math.max(0, idx), marks: 2, explanation: p.solution };
  });
}

export default function AssessmentBuilder() {
  const { saveAssessment, deleteAssessment, assessments, submissionsFor } = useClass();
  const { notify, settings, setView } = useApp();
  const [draft, setDraft] = useState<Assessment | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const mine = assessments.filter((a) => a.source === "teacher");
  const level = settings.level ?? "SHS";

  const setQ = (id: string, patch: Partial<AQuestion>) => setDraft((d) => (d ? { ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) } : d));

  const generate = async () => {
    if (!draft) return;
    const topicText = aiTopic.trim() || draft.title || draft.subject;
    setBusy(true);
    const tag = TOPICS.find((t) => topicText.toLowerCase().includes(t.toLowerCase())) ?? TOPICS[0];
    try {
      const prompt = `Create ${aiCount} ${level} ${draft.subject} exam questions on "${topicText}" for Ghana (WAEC style). Return ONLY a JSON array. Each item: {"type":"mcq","prompt":string,"options":[4 strings],"correct":index 0-3,"marks":2,"explanation":string}. Include 1 item of {"type":"short","prompt":string,"keyPoints":[3-4 short marking points],"marks":4,"explanation":string} at the end. Plain text maths, no markdown.`;
      const reply = await askOnce(prompt, "json", level, draft.subject);
      const parsed = extractJson<RawQ[]>(reply);
      const qs = Array.isArray(parsed) ? normalise(parsed, tag) : [];
      if (qs.length === 0) throw new Error("no questions parsed");
      setDraft({ ...draft, questions: [...draft.questions, ...qs] });
      notify(`${qs.length} questions generated. Please review before publishing.`, "success");
    } catch {
      const qs = offlineQuestions(draft.subject, tag, aiCount);
      setDraft({ ...draft, questions: [...draft.questions, ...qs] });
      notify(qs.length ? `AI is unavailable, so ${qs.length} past questions were added instead.` : "AI is unavailable and no offline questions matched.", "warn");
    } finally {
      setBusy(false);
    }
  };

  const problems = (d: Assessment): string[] => {
    const p: string[] = [];
    if (!d.title.trim()) p.push("Add a title");
    if (d.questions.length === 0) p.push("Add at least one question");
    d.questions.forEach((q, i) => {
      if (!q.prompt.trim()) p.push(`Question ${i + 1} needs text`);
      if (q.type === "mcq" && (q.options ?? []).some((o) => !o.trim())) p.push(`Question ${i + 1} has an empty option`);
      if (q.type === "short" && (q.keyPoints ?? []).length === 0) p.push(`Question ${i + 1} needs at least one marking point`);
    });
    return p;
  };

  if (!draft) {
    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Teacher tools" title="Assessment Builder">
          <Button variant="gold" onClick={() => setDraft(newDraft())}><Plus className="h-4 w-4" /> New assessment</Button>
        </SectionTitle>
        <p className="max-w-2xl text-sm text-slate-300">Write your own questions or let AI draft them, then publish to {CLASS_NAME}. Published tests appear in the student view instantly and flow into the gradebook.</p>
        {mine.length === 0 ? (
          <Glass className="grid place-items-center gap-3 p-10 text-center" as="section">
            <Wand2 className="h-10 w-10 text-amber-300" />
            <p className="text-lg font-bold text-white">No assessments yet</p>
            <p className="max-w-sm text-sm text-slate-400">Create your first one in under a minute with AI-generated questions.</p>
            <Button variant="gold" onClick={() => setDraft(newDraft())}>Create assessment</Button>
          </Glass>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mine.map((a) => (
              <Glass key={a.id} className="flex flex-col gap-3 p-5" as="article">
                <div className="flex items-start justify-between gap-2"><h2 className="font-bold text-white">{a.title}</h2><Pill tone={a.status === "published" ? "emerald" : "amber"}>{a.status}</Pill></div>
                <p className="text-xs text-slate-400">{a.subject} · {a.questions.length} questions · {a.durationMin} min</p>
                <p className="text-xs text-slate-400">{submissionsFor(a.id).length} submissions</p>
                <div className="mt-auto flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setDraft(a)}>Edit</Button>
                  {a.status === "published" && <Button variant="teal" onClick={() => setView("t-grades")}>Grades</Button>}
                  <Button variant="ghost" aria-label={`Delete ${a.title}`} onClick={() => { if (window.confirm("Delete this assessment and its submissions?")) { deleteAssessment(a.id); notify("Assessment deleted", "info"); } }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Glass>
            ))}
          </div>
        )}
      </div>
    );
  }

  const issues = problems(draft);
  const marks = draft.questions.reduce((n, q) => n + q.marks, 0);
  const subjects = SUBJECTS.filter((s) => s.level === level);

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Assessment Builder" title={draft.title || "New assessment"}>
        <Pill tone="cyan">{draft.questions.length} questions · {marks} marks</Pill>
      </SectionTitle>

      <Glass className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" as="section">
        <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-400">Title</span>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={80} placeholder="e.g. Quadratics end-of-topic test" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500" /></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-400">Subject</span>
          <select value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
            {subjects.map((s) => <option key={s.id}>{s.name}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-400">Duration (minutes)</span>
          <input type="number" min={5} max={180} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: Math.max(5, Math.min(180, Number(e.target.value) || 20)) })} className="mono min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white" /></label>
      </Glass>

      <Glass className="space-y-3 border-cyan-400/30 p-5" as="section">
        <h2 className="flex items-center gap-2 font-bold text-white"><Sparkles className="h-5 w-5 text-cyan-300" /> Generate questions with AI</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
          <label className="block"><span className="sr-only">Topic</span>
            <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} list="topics" placeholder="Topic, e.g. Electricity or Quadratic equations" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500" />
            <datalist id="topics">{TOPICS.map((t) => <option key={t} value={t} />)}</datalist></label>
          <label className="block"><span className="sr-only">Number of questions</span>
            <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}</select></label>
          <Button variant="teal" disabled={busy} onClick={() => void generate()}>{busy ? "Generating…" : "Generate"}</Button>
        </div>
        <p className="text-xs text-slate-400">Always review AI-written questions and answers before publishing. Check the correct option and the marking points.</p>
      </Glass>

      <ol className="space-y-4">
        {draft.questions.map((q, i) => (
          <li key={q.id}>
            <Glass className="space-y-3 p-4 sm:p-5" as="article">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Pill tone="amber">Q{i + 1}</Pill><Pill>{q.type === "mcq" ? "Multiple choice" : "Written"}</Pill></div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`topic-${q.id}`}>Topic</label>
                  <select id={`topic-${q.id}`} value={q.topic} onChange={(e) => setQ(q.id, { topic: e.target.value })} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs text-white">{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
                  <label className="sr-only" htmlFor={`marks-${q.id}`}>Marks</label>
                  <input id={`marks-${q.id}`} type="number" min={1} max={10} value={q.marks} onChange={(e) => setQ(q.id, { marks: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} className="mono min-h-11 w-16 rounded-xl border border-slate-700 bg-slate-900 px-2 text-center text-xs text-white" />
                  <Button variant="ghost" aria-label={`Remove question ${i + 1}`} onClick={() => setDraft({ ...draft, questions: draft.questions.filter((x) => x.id !== q.id) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <label className="block"><span className="sr-only">Question text</span>
                <textarea value={q.prompt} onChange={(e) => setQ(q.id, { prompt: e.target.value })} rows={2} placeholder="Question text" className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white placeholder:text-slate-500" /></label>
              {q.type === "mcq" ? (
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Options (select the correct one)">
                  {q.options?.map((o, idx) => (
                    <div key={idx} className={cx("flex items-center gap-2 rounded-xl border p-2", q.correct === idx ? "border-emerald-400/60 bg-emerald-400/5" : "border-slate-700")}>
                      <input type="radio" name={`c-${q.id}`} checked={q.correct === idx} onChange={() => setQ(q.id, { correct: idx })} aria-label={`Option ${"ABCD"[idx]} is correct`} className="h-5 w-5 accent-emerald-400" />
                      <span className="mono text-xs text-amber-300">{"ABCD"[idx]}</span>
                      <input value={o} onChange={(e) => setQ(q.id, { options: q.options?.map((x, j) => (j === idx ? e.target.value : x)) })} aria-label={`Option ${"ABCD"[idx]} text`} className="min-h-9 flex-1 bg-transparent text-sm text-white focus:outline-none" />
                    </div>
                  ))}
                </div>
              ) : (
                <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-400">Marking points (one per line). Answers are matched against these.</span>
                  <textarea value={(q.keyPoints ?? []).join("\n")} onChange={(e) => setQ(q.id, { keyPoints: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} rows={3} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" /></label>
              )}
              <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-400">Explanation shown to learners after marking</span>
                <input value={q.explanation} onChange={(e) => setQ(q.id, { explanation: e.target.value })} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white" /></label>
            </Glass>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blank("mcq", TOPICS[0])] })}><Plus className="h-4 w-4" /> Multiple choice</Button>
        <Button variant="ghost" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blank("short", TOPICS[0])] })}><Plus className="h-4 w-4" /> Written answer</Button>
      </div>

      {issues.length > 0 && <ul className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-100" role="status">{issues.slice(0, 4).map((x) => <li key={x}>• {x}</li>)}</ul>}

      <div className="sticky bottom-20 z-30 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 backdrop-blur lg:bottom-4">
        <Button variant="ghost" onClick={() => { if (window.confirm("Close without saving?")) setDraft(null); }}>Cancel</Button>
        <Button variant="ghost" onClick={() => setPreview(!preview)}><Eye className="h-4 w-4" /> {preview ? "Hide" : "Show"} answer key</Button>
        <Button variant="ghost" onClick={() => { saveAssessment({ ...draft, status: "draft" }); notify("Saved as draft", "success"); setDraft(null); }}>Save draft</Button>
        <Button variant="gold" className="ml-auto" disabled={issues.length > 0} onClick={() => { saveAssessment({ ...draft, status: "published", createdAt: Date.now() }); notify("Published to your class. Learners can see it now.", "success"); setDraft(null); setView("t-grades"); }}><Send className="h-4 w-4" /> Publish</Button>
      </div>

      {preview && (
        <Glass className="space-y-2 p-5" as="section">
          <h2 className="font-bold text-white">Answer key</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">{draft.questions.map((q) => <li key={q.id}>{q.type === "mcq" ? `${"ABCD"[q.correct ?? 0]}. ${q.options?.[q.correct ?? 0] ?? ""}` : (q.keyPoints ?? []).join("; ")}</li>)}</ol>
        </Glass>
      )}
    </div>
  );
}
