import { useEffect, useMemo, useState } from "react";
import { Award, BookOpen, Calculator, CheckCircle2, Circle, Clock, Layers, PlayCircle, Plus, Radio, School, Sparkles, Trophy } from "lucide-react";
import { SUBJECTS, TOTAL_CHAPTERS } from "../data/curriculum";
import { useApp } from "../state/AppContext";
import { useClass } from "../state/ClassContext";
import { studentRecommendations, studentTopicMastery } from "../lib/assessment";
import { RecoCard, useActOnReco } from "./student/Growth";
import { Button, Glass, Modal, Pill, ProgressRing, cx } from "../components/ui";
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
  { view: "player", label: "Video Lessons", icon: Radio, tone: "text-bad-t" },
  { view: "vault", label: "Ghana E-Textbooks", icon: BookOpen, tone: "text-brand-t" },
  { view: "tutor", label: "WAEC AI Lab", icon: Calculator, tone: "text-sky-t" },
  { view: "assessments", label: "My Assessments", icon: School, tone: "text-good-t" },
  { view: "growth", label: "My Growth", icon: Layers, tone: "text-violet-300" },
];

export default function Dashboard() {
  const { settings, progress, completion, badges, setView, toggleGoal, addGoal, gradeCard, lessons, openLesson } = useApp();
  const cls = useClass();
  const actOnReco = useActOnReco();
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

  const focus = useMemo(() => {
    const mine = cls.submissions.filter((x) => x.studentId === cls.me.id);
    const mastery = studentTopicMastery(cls.me, mine, cls.assessments, cls.gradings);
    return studentRecommendations(mastery, cls.published.length - mine.length, dueCards.length).slice(0, 3);
  }, [cls, dueCards.length]);

  const goalsDone = progress.goals.filter((g) => g.done).length;
  const goalPct = progress.goals.length ? (goalsDone / progress.goals.length) * 100 : 0;
  const earned = badges.filter((b) => b.earned);
  const lessonPct = lessons.length ? (Object.keys(progress.quizMastery).length / lessons.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand text-on-brand" aria-label="Welcome">
        <div className="grid gap-5 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-semibold opacity-80">{settings.level === "JHS" ? "JHS · BECE track" : "SHS · WASSCE track"}</p>
            <h1 className="mt-1 text-4xl font-extrabold leading-[1.05] sm:text-5xl">Akwaaba, {settings.name ?? "Scholar"}.</h1>
            <p className="mt-3 max-w-xl text-base opacity-90">
              {completion > 0 ? `You have covered ${Math.round(completion)}% of the curriculum. Keep the streak going.` : "Pick a chapter, ask the AI tutor, or sit a test. Every step you finish shows up here."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setView("tutor")} className="min-h-11 rounded-xl bg-surface px-5 text-sm font-bold text-ink shadow-sm transition hover:brightness-95">Ask the AI tutor</button>
            <button onClick={() => setView("assessments")} className="min-h-11 rounded-xl border border-white/40 px-5 text-sm font-bold text-on-brand transition hover:bg-white/10">Take a test</button>
          </div>
        </div>
        <div className="kente kente-thick" aria-hidden />
      </section>

      <section aria-label="Quick access" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {POWER.map((p) => (
          <button
            key={p.label}
            onClick={() => setView(p.view)}
            className="glass rise flex min-h-20 flex-col items-start justify-between rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-brand/50"
          >
            <p.icon className={cx("h-6 w-6", p.tone)} />
            <span className="text-sm font-bold text-ink">{p.label}</span>
          </button>
        ))}
      </section>

      <Glass className="space-y-3 border-brand/30 p-5" as="section">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Sparkles className="h-5 w-5 text-brand-t" /> Your focus today</h2>
        <ul className="grid gap-3 md:grid-cols-3">{focus.map((r) => <RecoCard key={r.id} r={r} onAct={actOnReco} />)}</ul>
      </Glass>

      <div className="grid gap-6 xl:grid-cols-3">
        <Glass className="p-5 xl:col-span-2" as="section">
          <h2 className="mb-4 text-lg font-bold text-ink">Mastery rings</h2>
          <div className="grid grid-cols-2 place-items-center gap-6 sm:grid-cols-4">
            <ProgressRing value={completion} label="Curriculum" sublabel={`${progress.completedChapters.length}/${TOTAL_CHAPTERS} chapters`} />
            <ProgressRing value={goalPct} tone="cyan" label="Daily goals" sublabel={`${goalsDone}/${progress.goals.length} done`} />
            <ProgressRing value={lessonPct} tone="emerald" label="Video quizzes" sublabel={`${Object.keys(progress.quizMastery).length}/${lessons.length} attempted`} />
            <ProgressRing value={(earned.length / Math.max(1, badges.length)) * 100} label="Badges" sublabel={`${earned.length} earned`} />
          </div>
        </Glass>

        <Glass className="p-5" as="section">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink"><Award className="h-5 w-5 text-brand-t" /> Mastery badges</h2>
          <ul className="space-y-2">
            {badges.map((b) => (
              <li key={b.id} className={cx("flex items-center gap-3 rounded-xl border p-3", b.earned ? "border-brand/40 bg-brand/10" : "border-line opacity-60")}>
                <Trophy className={cx("h-5 w-5 shrink-0", b.earned ? "text-brand-t" : "text-mute")} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{b.name}</p>
                  <p className="text-xs text-mute">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Glass>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Glass className="p-5" as="section">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink"><Clock className="h-5 w-5 text-sky-t" /> Upcoming live classes</h2>
          <ul className="space-y-3">
            {LIVE_CLASSES.map((c) => {
              const ms = mountedAt + c.startsInMin * 60_000 - now;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{c.title}</p>
                    <p className="text-xs text-mute">{c.teacher}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cx("mono rounded-lg px-2.5 py-1 text-sm font-bold", ms <= 0 ? "bg-bad/20 text-bad-t" : "bg-sky-b/10 text-sky-t")} aria-label={`Starts in ${countdown(ms)}`}>
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
          <h2 className="mb-3 text-lg font-bold text-ink">Daily revision goals</h2>
          <ul className="space-y-2">
            {progress.goals.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => toggleGoal(g.id)}
                  aria-pressed={g.done}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-sunken/60"
                >
                  {g.done ? <CheckCircle2 className="h-5 w-5 text-good-t" /> : <Circle className="h-5 w-5 text-mute" />}
                  <span className={cx(g.done && "text-mute line-through")}>{g.text}</span>
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
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface/80 px-3 text-sm text-ink placeholder:text-mute"
            />
            <Button variant="gold" type="submit" aria-label="Add goal"><Plus className="h-4 w-4" /></Button>
          </form>
        </Glass>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Glass className="p-5" as="section">
          <h2 className="mb-1 text-lg font-bold text-ink">Spaced repetition</h2>
          <p className="mb-4 text-sm text-mute">Flashcards come from the key ideas in every chapter and return on a 1, 2, 4, 8, 16 day schedule.</p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-4">
            <div>
              <p className="mono text-3xl font-bold text-brand-t">{dueCards.length}</p>
              <p className="text-xs text-mute">cards due now</p>
            </div>
            <Button variant="gold" disabled={dueCards.length === 0} onClick={() => setReviewing(true)}>Start review</Button>
          </div>
        </Glass>

        <Glass className="p-5" as="section">
          <h2 className="mb-3 text-lg font-bold text-ink">Continue learning</h2>
          <ul className="space-y-2">
            {lessons.slice(0, 3).map((l) => (
              <li key={l.id}>
                <button onClick={() => openLesson(l.id)} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-sky-b/50">
                  <PlayCircle className="h-6 w-6 shrink-0 text-sky-t" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{l.title}</span>
                    <span className="block text-xs text-mute">{l.subject} · {l.level}</span>
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
          <p className="mono text-xs text-mute">{queue.length} left in this session</p>
          <div className="rounded-2xl border border-line bg-surface/70 p-6">
            <Pill tone="cyan">{card.subject}</Pill>
            <p className="mt-3 text-sm text-mute">Recall a key idea from</p>
            <p className="text-xl font-extrabold text-ink">{card.chapter}</p>
            {revealed && <p className="rise mt-4 rounded-xl bg-brand/10 p-4 text-base text-brand-t">{card.idea}</p>}
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
        <p className="py-8 text-center text-ink-2">All caught up. Cards you answered correctly return at longer intervals. 🎉</p>
      )}
    </Modal>
  );
}
