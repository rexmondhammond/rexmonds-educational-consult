import { useEffect, useMemo, useState } from "react";
import { Award, BookOpen, Calculator, CheckCircle2, Circle, Clock, Layers, PlayCircle, Plus, Radio, School, Trophy } from "lucide-react";
import { SUBJECTS, TOTAL_CHAPTERS } from "../data/curriculum";
import { useApp } from "../state/AppContext";
import { Button, Glass, Modal, Pill, ProgressRing, SectionTitle, cx } from "../components/ui";
import type { View } from "../types";

interface LiveClass {
  id: string;
  title: string;
  teacher: string;
  startsInMin: number;
}

const LIVE_CLASSES: LiveClass[] = [
  { id: "lc1", title: "WASSCE Core Maths: Quadratics Clinic", teacher: "Mr. Rexmond", startsInMin: 42 },
  { id: "lc2", title: "BECE Integrated Science Revision", teacher: "Mrs. Asante", startsInMin: 190 },
  { id: "lc3", title: "Elective Physics: Circuits Lab", teacher: "Mr. Boateng", startsInMin: 1500 },
];

interface Card {
  id: string;
  subject: string;
  chapter: string;
  idea: string;
}

const ALL_CARDS: Card[] = SUBJECTS.flatMap((s) =>
  s.chapters.flatMap((c) =>
    c.keyIdeas.map((idea, i) => ({ id: `${s.id}:${c.code}:${i}`, subject: s.name, chapter: c.title, idea })),
  ),
);

const pad = (n: number) => String(n).padStart(2, "0");
function countdown(ms: number): string {
  if (ms <= 0) return "LIVE NOW";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

const POWER: { view: View; label: string; icon: typeof Radio; tone: string }[] = [
  { view: "studio", label: "Live Classes", icon: Radio, tone: "text-red-300" },
  { view: "vault", label: "Ghana E-Textbooks", icon: BookOpen, tone: "text-amber-300" },
  { view: "tutor", label: "WAEC AI Lab", icon: Calculator, tone: "text-cyan-300" },
  { view: "pasco", label: "Schools League", icon: School, tone: "text-emerald-300" },
  { view: "pasco", label: "Pasco Hub", icon: Layers, tone: "text-violet-300" },
];

export default function Dashboard() {
  const { settings, progress, completion, badges, setView, toggleGoal, addGoal, gradeCard, lessons, openLesson } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const [mountedAt] = useState(() => Date.now());
  const [goalText, setGoalText] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const dueCards = useMemo(
    () => ALL_CARDS.filter((c) => (progress.flashcards[c.id]?.due ?? 0) <= now),
    [progress.flashcards, now],
  );

  const goalsDone = progress.goals.filter((g) => g.done).length;
  const goalPct = progress.goals.length ? (goalsDone / progress.goals.length) * 100 : 0;
  const earned = badges.filter((b) => b.earned);
  const lessonPct = lessons.length ? (Object.keys(progress.quizMastery).length / lessons.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Student Command Center" title={`Akwaaba, ${settings.name ?? "Scholar"} 👋`}>
        <Pill tone="amber"><Trophy className="h-3.5 w-3.5" /> {earned.length} / {badges.length} badges</Pill>
      </SectionTitle>

      <section aria-label="Quick access" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {POWER.map((p) => (
          <button
            key={p.label}
            onClick={() => setView(p.view)}
            className="glass rise flex min-h-20 flex-col items-start justify-between rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400/50"
          >
            <p.icon className={cx("h-6 w-6", p.tone)} />
            <span className="text-sm font-bold text-white">{p.label}</span>
          </button>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Glass className="p-5 xl:col-span-2" as="section">
          <h2 className="mb-4 text-lg font-bold text-white">Mastery rings</h2>
          <div className="grid grid-cols-2 place-items-center gap-6 sm:grid-cols-4">
            <ProgressRing value={completion} label="Curriculum" sublabel={`${progress.completedChapters.length}/${TOTAL_CHAPTERS} chapters`} />
            <ProgressRing value={goalPct} tone="cyan" label="Daily goals" sublabel={`${goalsDone}/${progress.goals.length} done`} />
            <ProgressRing value={lessonPct} tone="emerald" label="Video quizzes" sublabel={`${Object.keys(progress.quizMastery).length}/${lessons.length} attempted`} />
            <ProgressRing value={(earned.length / Math.max(1, badges.length)) * 100} label="Badges" sublabel={`${earned.length} earned`} />
          </div>
        </Glass>

        <Glass className="p-5" as="section">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white"><Award className="h-5 w-5 text-amber-400" /> Mastery badges</h2>
          <ul className="space-y-2">
            {badges.map((b) => (
              <li key={b.id} className={cx("flex items-center gap-3 rounded-xl border p-3", b.earned ? "border-amber-400/40 bg-amber-400/10" : "border-slate-800 opacity-60")}>
                <Trophy className={cx("h-5 w-5 shrink-0", b.earned ? "text-amber-300" : "text-slate-500")} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{b.name}</p>
                  <p className="text-xs text-slate-400">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Glass>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Glass className="p-5" as="section">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white"><Clock className="h-5 w-5 text-cyan-300" /> Upcoming live classes</h2>
          <ul className="space-y-3">
            {LIVE_CLASSES.map((c) => {
              const ms = mountedAt + c.startsInMin * 60_000 - now;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{c.title}</p>
                    <p className="text-xs text-slate-400">{c.teacher}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cx("mono rounded-lg px-2.5 py-1 text-sm font-bold", ms <= 0 ? "bg-red-500/20 text-red-300" : "bg-cyan-400/10 text-cyan-300")} aria-label={`Starts in ${countdown(ms)}`}>
                      {countdown(ms)}
                    </span>
                    <Button variant="ghost" onClick={() => setView("studio")}>Join</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Glass>

        <Glass className="p-5" as="section">
          <h2 className="mb-3 text-lg font-bold text-white">Daily revision goals</h2>
          <ul className="space-y-2">
            {progress.goals.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => toggleGoal(g.id)}
                  aria-pressed={g.done}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-slate-800/60"
                >
                  {g.done ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-slate-500" />}
                  <span className={cx(g.done && "text-slate-500 line-through")}>{g.text}</span>
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); addGoal(goalText); setGoalText(""); }}
          >
            <label className="sr-only" htmlFor="new-goal">New goal</label>
            <input
              id="new-goal" value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="Add a goal…"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500"
            />
            <Button variant="gold" type="submit" aria-label="Add goal"><Plus className="h-4 w-4" /></Button>
          </form>
        </Glass>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Glass className="p-5" as="section">
          <h2 className="mb-1 text-lg font-bold text-white">Spaced repetition</h2>
          <p className="mb-4 text-sm text-slate-400">Flashcards come from the key ideas in every chapter and return on a 1, 2, 4, 8, 16 day schedule.</p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 p-4">
            <div>
              <p className="mono text-3xl font-bold text-amber-300">{dueCards.length}</p>
              <p className="text-xs text-slate-400">cards due now</p>
            </div>
            <Button variant="gold" disabled={dueCards.length === 0} onClick={() => setReviewing(true)}>Start review</Button>
          </div>
        </Glass>

        <Glass className="p-5" as="section">
          <h2 className="mb-3 text-lg font-bold text-white">Continue learning</h2>
          <ul className="space-y-2">
            {lessons.slice(0, 3).map((l) => (
              <li key={l.id}>
                <button onClick={() => openLesson(l.id)} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-800 p-3 text-left hover:border-cyan-400/50">
                  <PlayCircle className="h-6 w-6 shrink-0 text-cyan-300" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white">{l.title}</span>
                    <span className="block text-xs text-slate-400">{l.subject} · {l.level}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Glass>
      </div>

      <FlashcardReview open={reviewing} cards={dueCards} onClose={() => setReviewing(false)} onGrade={gradeCard} />
    </div>
  );
}

function FlashcardReview({ open, cards, onClose, onGrade }: { open: boolean; cards: Card[]; onClose: () => void; onGrade: (id: string, ok: boolean) => void }) {
  const [queue, setQueue] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (open) {
      setQueue(cards.slice(0, 10));
      setRevealed(false);
    }
    // Snapshot the due cards only when the dialog opens so grading does not reshuffle the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const card = queue[0];
  const answer = (ok: boolean) => {
    if (!card) return;
    onGrade(card.id, ok);
    setQueue((q) => q.slice(1));
    setRevealed(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Flashcard review">
      {card ? (
        <div className="space-y-4">
          <p className="mono text-xs text-slate-400">{queue.length} left in this session</p>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
            <Pill tone="cyan">{card.subject}</Pill>
            <p className="mt-3 text-sm text-slate-400">Recall a key idea from</p>
            <p className="text-xl font-extrabold text-white">{card.chapter}</p>
            {revealed && <p className="rise mt-4 rounded-xl bg-amber-400/10 p-4 text-base text-amber-100">{card.idea}</p>}
          </div>
          {!revealed ? (
            <Button variant="teal" className="w-full" onClick={() => setRevealed(true)}>Reveal answer</Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" onClick={() => answer(false)}>Again</Button>
              <Button variant="gold" onClick={() => answer(true)}>Got it</Button>
            </div>
          )}
        </div>
      ) : (
        <p className="py-8 text-center text-slate-300">All caught up. Cards you answered correctly return at longer intervals. 🎉</p>
      )}
    </Modal>
  );
}
