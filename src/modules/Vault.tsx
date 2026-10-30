import { useMemo, useState } from "react";
import { ArrowLeft, Bot, CheckCircle2, CloudDownload, Download, Lightbulb, Printer, Search, TriangleAlert } from "lucide-react";
import { SUBJECTS, chapterKey } from "../data/curriculum";
import { useApp } from "../state/AppContext";
import { ACCENT, Button, Glass, Pill, SectionTitle, cx } from "../components/ui";
import type { Chapter, Level, Subject } from "../types";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function manualHtml(subject: Subject): string {
  const chapters = subject.chapters
    .map(
      (c: Chapter) => `
    <section>
      <h2>${escapeHtml(c.code)} · ${escapeHtml(c.title)}</h2>
      <h3>Learning outcomes</h3><ul>${c.outcomes.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
      <h3>Key ideas</h3><ul>${c.keyIdeas.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
      <h3>Worked example: ${escapeHtml(c.example.title)}</h3>
      <p><b>Problem:</b> ${escapeHtml(c.example.problem)}</p>
      <ol>${c.example.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
      <p><b>Answer:</b> ${escapeHtml(c.example.answer)}</p>
      <p class="warn"><b>Chief Examiner pitfall:</b> ${escapeHtml(c.pitfall)}</p>
    </section>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject.name)} Study Manual</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.55;color:#111}
h1{border-bottom:3px solid #f59e0b;padding-bottom:.4rem}h2{margin-top:2rem;color:#b45309}h3{margin-bottom:.2rem}
.warn{background:#fef3c7;border-left:4px solid #f59e0b;padding:.6rem .8rem}footer{margin-top:3rem;color:#555;font-size:.85rem}</style></head>
<body><h1>${escapeHtml(subject.name)}</h1>
<p>${escapeHtml(subject.level)} · ${escapeHtml(subject.track)} · Syllabus ${escapeHtml(subject.syllabusCode)}</p>
<p>${escapeHtml(subject.summary)}</p>${chapters}
<footer>Rexmond's Educational Consult · printable offline study manual</footer></body></html>`;
}

function exportManual(subject: Subject, print: boolean) {
  const html = manualHtml(subject);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  if (print) {
    const w = window.open(url, "_blank");
    if (w) {
      w.addEventListener("load", () => w.print());
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    // Pop-up blocked or sandboxed iframe: fall through to a plain download.
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subject.id}-study-manual.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export default function Vault() {
  const { progress, toggleChapter, settings, updateSettings } = useApp();
  const [level, setLevel] = useState<Level>("JHS");
  const [track, setTrack] = useState<"All" | "Core" | "Elective">("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = SUBJECTS.find((s) => s.id === selectedId) ?? null;

  const list = useMemo(
    () =>
      SUBJECTS.filter(
        (s) =>
          s.level === level &&
          (level === "JHS" || track === "All" || s.track === track) &&
          s.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [level, track, query],
  );

  if (selected) {
    return (
      <SubjectView
        subject={selected}
        onBack={() => setSelectedId(null)}
        done={progress.completedChapters}
        onToggle={(code) => toggleChapter(selected.id, code)}
        cached={settings.cachedTextbooks.includes(selected.id)}
        onCache={() =>
          updateSettings({
            cachedTextbooks: settings.cachedTextbooks.includes(selected.id)
              ? settings.cachedTextbooks.filter((x) => x !== selected.id)
              : [...settings.cachedTextbooks, selected.id],
          })
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="NaCCA & GES aligned" title="Curriculum & Textbook Vault" />

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Level" className="glass inline-flex rounded-xl p-1">
          {(["JHS", "SHS"] as Level[]).map((l) => (
            <button
              key={l} role="tab" aria-selected={level === l} onClick={() => setLevel(l)}
              className={cx("min-h-11 rounded-lg px-5 text-sm font-bold transition", level === l ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:text-white")}
            >
              {l === "JHS" ? "JHS 1-3 (Basic 7-9)" : "SHS 1-3 (WASSCE)"}
            </button>
          ))}
        </div>

        {level === "SHS" && (
          <div role="tablist" aria-label="Track" className="glass inline-flex rounded-xl p-1">
            {(["All", "Core", "Elective"] as const).map((t) => (
              <button
                key={t} role="tab" aria-selected={track === t} onClick={() => setTrack(t)}
                className={cx("min-h-11 rounded-lg px-4 text-sm font-semibold", track === t ? "bg-cyan-400 text-slate-950" : "text-slate-300")}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <label className="relative min-w-52 flex-1 sm:max-w-xs">
          <span className="sr-only">Search subjects</span>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subjects…"
            className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
          />
        </label>
      </div>

      <p className="mono text-xs text-slate-400">{list.length} subjects</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((s) => {
          const done = s.chapters.filter((c) => progress.completedChapters.includes(chapterKey(s.id, c.code))).length;
          const pct = Math.round((done / s.chapters.length) * 100);
          return (
            <button
              key={s.id} onClick={() => setSelectedId(s.id)}
              className={cx("rise rounded-2xl border bg-gradient-to-br p-5 text-left transition hover:-translate-y-1", ACCENT[s.accent])}
            >
              <div className="mb-2 flex flex-wrap gap-2">
                <Pill tone="slate">{s.level === "JHS" ? "JHS" : s.track}</Pill>
                {settings.cachedTextbooks.includes(s.id) && <Pill tone="emerald">Offline</Pill>}
              </div>
              <h2 className="text-lg font-extrabold leading-snug text-white">{s.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-300">{s.summary}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden>
                <div className="h-full rounded-full bg-current" style={{ width: `${pct}%` }} />
              </div>
              <p className="mono mt-1 text-xs text-slate-400">{done}/{s.chapters.length} chapters · {s.syllabusCode}</p>
            </button>
          );
        })}
      </div>
      {list.length === 0 && <p className="text-slate-400">No subjects match your search.</p>}
    </div>
  );
}

function SubjectView({
  subject, onBack, done, onToggle, cached, onCache,
}: { subject: Subject; onBack: () => void; done: string[]; onToggle: (code: string) => void; cached: boolean; onCache: () => void }) {
  const { askTutor } = useApp();
  const [openCode, setOpenCode] = useState<string>(subject.chapters[0]?.code ?? "");
  const chapter = subject.chapters.find((c) => c.code === openCode) ?? subject.chapters[0];

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> All subjects</Button>
      <Glass className={cx("bg-gradient-to-br p-6", ACCENT[subject.accent])}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mono text-xs uppercase tracking-widest">{subject.level} · {subject.track} · {subject.syllabusCode}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">{subject.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">{subject.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={() => exportManual(subject, false)}><Download className="h-4 w-4" /> Export Study Manual</Button>
            <Button variant="ghost" onClick={() => exportManual(subject, true)}><Printer className="h-4 w-4" /> Print</Button>
            <Button variant={cached ? "teal" : "ghost"} onClick={onCache} aria-pressed={cached}>
              <CloudDownload className="h-4 w-4" /> {cached ? "Saved offline" : "Save offline"}
            </Button>
          </div>
        </div>
      </Glass>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Chapters" className="glass rounded-2xl p-2">
          {subject.chapters.map((c) => {
            const isDone = done.includes(chapterKey(subject.id, c.code));
            return (
              <button
                key={c.code} onClick={() => setOpenCode(c.code)} aria-current={chapter?.code === c.code ? "true" : undefined}
                className={cx("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm", chapter?.code === c.code ? "bg-amber-400/15 text-amber-200" : "text-slate-300 hover:bg-slate-800/60")}
              >
                <CheckCircle2 className={cx("h-5 w-5 shrink-0", isDone ? "text-emerald-400" : "text-slate-600")} />
                <span><span className="mono block text-[11px] text-slate-500">{c.code}</span>{c.title}</span>
              </button>
            );
          })}
        </nav>

        {chapter && (
          <Glass className="space-y-5 p-5 sm:p-7" as="article">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mono text-xs text-amber-400">{chapter.code}</p>
                <h2 className="text-xl font-extrabold text-white">{chapter.title}</h2>
              </div>
              <Button
                variant={done.includes(chapterKey(subject.id, chapter.code)) ? "teal" : "ghost"}
                onClick={() => onToggle(chapter.code)}
                aria-pressed={done.includes(chapterKey(subject.id, chapter.code))}
              >
                <CheckCircle2 className="h-4 w-4" />
                {done.includes(chapterKey(subject.id, chapter.code)) ? "Completed" : "Mark complete"}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Learning outcomes</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">{chapter.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Key ideas</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">{chapter.keyIdeas.map((o) => <li key={o} className="mono text-[13px]">{o}</li>)}</ul>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-cyan-300"><Lightbulb className="h-4 w-4" /> Worked example: {chapter.example.title}</h3>
              <p className="text-sm text-slate-100">{chapter.example.problem}</p>
              <ol className="mono mt-3 list-decimal space-y-1 pl-5 text-[13px] text-slate-300">{chapter.example.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              <p className="mono mt-3 rounded-lg bg-slate-950/60 p-3 text-sm text-amber-200">Answer: {chapter.example.answer}</p>
            </div>

            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-300"><TriangleAlert className="h-4 w-4" /> Chief Examiner pitfall</h3>
              <p className="text-sm text-slate-200">{chapter.pitfall}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="teal" onClick={() => askTutor({ prompt: `Explain "${chapter.title}" from ${subject.name} in simple terms with an example I can relate to.`, subject: subject.name })}>
                <Bot className="h-4 w-4" /> Explain with AI
              </Button>
              <Button variant="ghost" onClick={() => askTutor({ prompt: `Quiz me on "${chapter.title}" (${subject.name}).`, subject: subject.name, mode: "quiz" })}>
                Quiz me on this chapter
              </Button>
            </div>
          </Glass>
        )}
      </div>
    </div>
  );
}
