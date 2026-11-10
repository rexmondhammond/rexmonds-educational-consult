import type { Level } from "../types";
import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, Download, FileText, Loader2, Play, Plus, Presentation, Save, Sparkles, Trash2 } from "lucide-react";
import { SUBJECTS } from "../data/curriculum";
import { curriculumDeck, exportPptx, generateDeck, normaliseSlide, printDeck, SIZES, type Deck, type Progress, type Slide } from "../lib/deck";
import { AiError } from "../lib/ai";
import { useDecks } from "../lib/decks";
import { useApp } from "../state/AppContext";
import { useClass } from "../state/ClassContext";
import { Presenter } from "../components/Presenter";
import { SlideView } from "../components/SlideView";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";

export default function Slides() {
  const { settings, notify } = useApp();
  const { activeClass } = useClass();
  const { decks, save, remove } = useDecks();
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState(activeClass?.subject ?? "");
  const [size, setSize] = useState<number>(12);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [idx, setIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const level: Level = activeClass?.level ?? settings.level ?? "SHS";

  const subjects = useMemo(() => SUBJECTS.filter((s) => s.level === level), [level]);
  const chapters = useMemo(() => {
    const s = SUBJECTS.find((x) => x.name === subject && x.level === level);
    return s?.chapters ?? [];
  }, [subject, level]);

  const open = (d: Deck) => { setDeck(d); setIdx(0); setDirty(false); };

  const generate = async () => {
    const t = topic.trim();
    if (t.length < 3) { notify("Type the topic you want to teach first.", "info"); return; }
    abort.current?.abort();
    abort.current = new AbortController();
    setBusy(true);
    setProgress({ done: 0, total: size, message: "Starting…" });
    try {
      const d = await generateDeck({ topic: t, subject, level, count: size, onProgress: setProgress, signal: abort.current.signal });
      open(d); setDirty(true);
      notify(`Created ${d.slides.length} slides on ${d.topic}.`, "success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") { /* cancelled */ } else {
        const why = err instanceof AiError ? err.message : "The AI could not finish the deck.";
        const d = curriculumDeck(t, subject, level);
        open(d); setDirty(true);
        notify(`${why} Built a starter deck from the curriculum vault instead.`, "info");
      }
    } finally { setBusy(false); setProgress(null); }
  };

  const update = (patch: Partial<Slide>) => {
    if (!deck) return;
    setDeck({ ...deck, slides: deck.slides.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
    setDirty(true);
  };
  const move = (d: number) => {
    if (!deck) return;
    const j = idx + d;
    if (j < 0 || j >= deck.slides.length) return;
    const slides = [...deck.slides];
    [slides[idx], slides[j]] = [slides[j], slides[idx]];
    setDeck({ ...deck, slides }); setIdx(j); setDirty(true);
  };
  const addSlide = () => {
    if (!deck) return;
    const s = normaliseSlide({ kind: "concept", title: "New slide", bullets: ["Add your teaching point here."] });
    const slides = [...deck.slides.slice(0, idx + 1), s, ...deck.slides.slice(idx + 1)];
    setDeck({ ...deck, slides }); setIdx(idx + 1); setDirty(true);
  };
  const removeSlide = () => {
    if (!deck || deck.slides.length < 2) return;
    setDeck({ ...deck, slides: deck.slides.filter((_, i) => i !== idx) });
    setIdx(Math.max(0, idx - 1)); setDirty(true);
  };
  const persist = async () => {
    if (!deck) return;
    const err = await save(deck);
    if (err) notify(`Could not save: ${err}`, "warn"); else { setDirty(false); notify("Deck saved.", "success"); }
  };

  const slide = deck?.slides[idx];

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Teach" title="AI slides">
        Pick any topic and the AI writes a full teaching deck with worked examples, diagrams, class activities, checks and speaker notes. Present it full screen and share your screen at any time.
      </SectionTitle>

      <Glass className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem_13rem]">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-2">Topic to teach</span>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && void generate()} placeholder="e.g. Solving quadratic equations by factorisation" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink outline-none focus:border-brand" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-2">Subject</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink">
              <option value="">Any subject</option>
              {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-2">Length</span>
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink">
              {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>
        {chapters.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-mute">Or pick a {subject} chapter from the NaCCA vault:</p>
            <div className="flex flex-wrap gap-1.5">{chapters.map((c) => <button key={c.code} onClick={() => setTopic(c.title)} className="min-h-9 rounded-full border border-line px-3 text-xs text-ink hover:border-brand">{c.title}</button>)}</div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="gold" onClick={() => void generate()} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy ? "Writing slides…" : "Generate slides with AI"}</Button>
          <Button onClick={() => { const t = topic.trim() || subject; if (t.length < 3) { notify("Type a topic or choose a subject first.", "info"); return; } open(curriculumDeck(t, subject, level)); setDirty(true); }} disabled={busy}><BookOpen size={16} />Build from curriculum vault</Button>
          {busy && <Button onClick={() => abort.current?.abort()}>Cancel</Button>}
        </div>
        {progress && (
          <div role="status" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-sunken"><div className="h-full bg-brand transition-all" style={{ width: `${Math.max(6, (progress.done / Math.max(1, progress.total)) * 100)}%` }} /></div>
            <p className="mono mt-1 text-xs text-mute">{progress.message}</p>
          </div>
        )}
      </Glass>

      {deck && slide && (
        <Glass className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-auto min-w-0 truncate text-lg font-bold text-brand-t">{deck.topic}</h3>
            <Pill tone={deck.source === "ai" ? "cyan" : "slate"}>{deck.source === "ai" ? "AI written" : "From vault"}</Pill>
            <Button variant="gold" onClick={() => setPresenting(true)}><Play size={16} />Present</Button>
            <Button onClick={() => void persist()} disabled={!dirty}><Save size={16} />{dirty ? "Save" : "Saved"}</Button>
            <Button onClick={() => { if (!printDeck(deck)) notify("Allow pop-ups to print or save as PDF.", "warn"); }}><FileText size={16} />PDF</Button>
            <Button onClick={() => void exportPptx(deck).catch(() => notify("PowerPoint export failed.", "warn"))}><Download size={16} />PowerPoint</Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[11rem_1fr]">
            <ol className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[34rem] lg:flex-col lg:overflow-y-auto" aria-label="Slides">
              {deck.slides.map((s, i) => (
                <li key={s.id} className="w-36 shrink-0 lg:w-auto">
                  <button onClick={() => setIdx(i)} aria-current={i === idx} className={cx("w-full overflow-hidden rounded-lg border-2 text-left", i === idx ? "border-brand" : "border-transparent hover:border-line")}>
                    <SlideView slide={s} index={i} total={deck.slides.length} className="pointer-events-none" />
                  </button>
                </li>
              ))}
            </ol>

            <div className="min-w-0 space-y-3">
              <SlideView slide={slide} index={idx} total={deck.slides.length} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => move(-1)} disabled={idx === 0} aria-label="Move slide up"><ArrowUp size={16} /></Button>
                <Button onClick={() => move(1)} disabled={idx === deck.slides.length - 1} aria-label="Move slide down"><ArrowDown size={16} /></Button>
                <Button onClick={addSlide}><Plus size={16} />Add slide</Button>
                <Button onClick={removeSlide} disabled={deck.slides.length < 2}><Trash2 size={16} />Delete</Button>
              </div>
              <label className="block text-sm"><span className="mb-1 block text-ink-2">Title</span>
                <input value={slide.title} onChange={(e) => update({ title: e.target.value })} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink" /></label>
              <label className="block text-sm"><span className="mb-1 block text-ink-2">Points (one per line)</span>
                <textarea value={slide.bullets.join("\n")} onChange={(e) => update({ bullets: e.target.value.split("\n").filter((l) => l.trim()) })} rows={5} className="w-full rounded-xl border border-line bg-surface p-3 text-ink" /></label>
              <label className="block text-sm"><span className="mb-1 block text-ink-2">Speaker notes</span>
                <textarea value={slide.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} className="w-full rounded-xl border border-line bg-surface p-3 text-ink" /></label>
              <label className="block text-sm"><span className="mb-1 block text-ink-2">Diagram</span>
                <select value={slide.diagram} onChange={(e) => update({ diagram: e.target.value as Slide["diagram"] })} className="min-h-11 rounded-xl border border-line bg-surface px-3 text-ink">
                  {["none", "cartesian", "parabola", "unit-circle", "bohr", "right-triangle", "number-line"].map((d) => <option key={d}>{d}</option>)}
                </select></label>
            </div>
          </div>
        </Glass>
      )}

      {decks.length > 0 && (
        <section aria-labelledby="saved-decks">
          <h3 id="saved-decks" className="mb-2 flex items-center gap-2 text-base font-bold text-ink"><Presentation size={18} className="text-sky-t" />Saved decks</h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((d) => (
              <li key={d.id}><Glass className="flex items-center gap-3 p-3">
                <button onClick={() => open(d)} className="min-w-0 flex-1 text-left"><p className="truncate font-semibold text-ink">{d.topic}</p><p className="mono text-xs text-mute">{d.slides.length} slides · {d.subject || d.level} · {new Date(d.createdAt).toLocaleDateString()}</p></button>
                <Button onClick={() => void remove(d.id)} aria-label={`Delete ${d.topic}`}><Trash2 size={16} /></Button>
              </Glass></li>
            ))}
          </ul>
        </section>
      )}

      {presenting && deck && <Presenter deck={deck} index={idx} onIndex={setIdx} onClose={() => setPresenting(false)} />}
    </div>
  );
}
