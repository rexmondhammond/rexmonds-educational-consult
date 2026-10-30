import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import confetti from "canvas-confetti";
import { SUBJECTS, TOTAL_CHAPTERS, chapterKey } from "../data/curriculum";
import { DEMO_LESSONS } from "../data/videos";
import { usePersistentState } from "../lib/storage";
import type { Progress, Settings, VideoLesson, View } from "../types";

const DEFAULT_PROGRESS: Progress = {
  completedChapters: [],
  quizMastery: {},
  flashcards: {},
  badges: [],
  goals: [
    { id: "g1", text: "Revise one chapter of Core Mathematics", done: false },
    { id: "g2", text: "Attempt 3 Pasco questions", done: false },
    { id: "g3", text: "Review today's flashcards", done: false },
  ],
  library: [],
};

const DEFAULT_SETTINGS: Settings = {
  dataSaver: false,
  audioOnly: false,
  compressImages: true,
  carrier: "MTN",
  cachedTextbooks: [],
  cachedPasco: [],
};

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  earned: boolean;
}

interface AppState {
  view: View;
  setView: (v: View) => void;
  activeLessonId: string | null;
  openLesson: (id: string) => void;
  progress: Progress;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  lessons: VideoLesson[];
  publishLesson: (lesson: VideoLesson) => void;
  toggleChapter: (subjectId: string, code: string) => void;
  recordQuiz: (lessonId: string, score: number, total: number) => void;
  addGoal: (text: string) => void;
  toggleGoal: (id: string) => void;
  gradeCard: (id: string, correct: boolean) => void;
  completion: number;
  badges: BadgeDef[];
  online: boolean;
  celebrate: () => void;
  tutorSeed: TutorSeed | null;
  askTutor: (seed: TutorSeed) => void;
  clearTutorSeed: () => void;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

export interface TutorSeed {
  prompt: string;
  mode?: "explain" | "quiz" | "mark" | "plan";
  subject?: string;
}

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "warn";
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

const DAY = 24 * 60 * 60 * 1000;
const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16];

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("dashboard");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [progress, setProgress] = usePersistentState<Progress>("rex.progress.v1", DEFAULT_PROGRESS);
  const [settings, setSettings] = usePersistentState<Settings>("rex.settings.v1", DEFAULT_SETTINGS);
  const [recorded, setRecorded] = usePersistentState<VideoLesson[]>("rex.recorded.v1", []);
  const [tutorSeed, setTutorSeed] = useState<TutorSeed | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toastId = useRef(0);
  const [online, setOnline] = useState<boolean>(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("data-saver", settings.dataSaver);
  }, [settings.dataSaver]);

  const lessons = useMemo(() => [...recorded, ...DEMO_LESSONS], [recorded]);

  const celebrate = useCallback(() => {
    if (settings.dataSaver) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    void confetti({ particleCount: 140, spread: 80, origin: { y: 0.65 }, colors: ["#fbbf24", "#22d3ee", "#f59e0b", "#06b6d4", "#ffffff"] });
  }, [settings.dataSaver]);

  const completion = useMemo(
    () => Math.round((progress.completedChapters.length / Math.max(1, TOTAL_CHAPTERS)) * 100),
    [progress.completedChapters.length],
  );

  const badges = useMemo<BadgeDef[]>(() => {
    const done = new Set(progress.completedChapters);
    const allDone = (subjectId: string) => {
      const s = SUBJECTS.find((x) => x.id === subjectId);
      return !!s && s.chapters.every((c) => done.has(chapterKey(s.id, c.code)));
    };
    const perfectQuiz = Object.values(progress.quizMastery).some((v) => v >= 100);
    return [
      { id: "first-steps", name: "First Steps", description: "Complete your first chapter", earned: done.size >= 1 },
      { id: "algebra-sovereign", name: "Algebra Sovereign", description: "Complete every Core Mathematics chapter", earned: allDone("shs-core-math") },
      { id: "elective-physics-prodigy", name: "Elective Physics Prodigy", description: "Complete every Physics chapter", earned: allDone("shs-physics") },
      { id: "checkpoint-master", name: "Checkpoint Master", description: "Score 100% on a video lesson checkpoint quiz", earned: perfectQuiz },
      { id: "scholar", name: "Rising Scholar", description: "Reach 25% overall curriculum completion", earned: completion >= 25 },
    ];
  }, [progress.completedChapters, progress.quizMastery, completion]);

  // Persist newly earned badges and celebrate them.
  const seenBadges = useRef<Set<string> | null>(null);
  useEffect(() => {
    const earnedIds = badges.filter((b) => b.earned).map((b) => b.id);
    if (seenBadges.current === null) {
      seenBadges.current = new Set(progress.badges);
    }
    const fresh = earnedIds.filter((id) => !seenBadges.current?.has(id));
    if (fresh.length > 0) {
      fresh.forEach((id) => seenBadges.current?.add(id));
      setProgress((p) => ({ ...p, badges: Array.from(new Set([...p.badges, ...earnedIds])) }));
      celebrate();
    }
  }, [badges, progress.badges, setProgress, celebrate]);

  const toggleChapter = useCallback(
    (subjectId: string, code: string) => {
      const key = chapterKey(subjectId, code);
      setProgress((p) => ({
        ...p,
        completedChapters: p.completedChapters.includes(key)
          ? p.completedChapters.filter((k) => k !== key)
          : [...p.completedChapters, key],
      }));
    },
    [setProgress],
  );

  const recordQuiz = useCallback(
    (lessonId: string, score: number, total: number) => {
      const pct = total === 0 ? 0 : Math.round((score / total) * 100);
      setProgress((p) => ({
        ...p,
        quizMastery: { ...p.quizMastery, [lessonId]: Math.max(p.quizMastery[lessonId] ?? 0, pct) },
      }));
    },
    [setProgress],
  );

  const addGoal = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      setProgress((p) => ({ ...p, goals: [...p.goals, { id: `g${Date.now()}`, text: clean, done: false }] }));
    },
    [setProgress],
  );

  const toggleGoal = useCallback(
    (id: string) => {
      setProgress((p) => ({ ...p, goals: p.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) }));
    },
    [setProgress],
  );

  const gradeCard = useCallback(
    (id: string, correct: boolean) => {
      setProgress((p) => {
        const current = p.flashcards[id]?.box ?? 0;
        const box = correct ? Math.min(BOX_INTERVAL_DAYS.length - 1, current + 1) : 0;
        return { ...p, flashcards: { ...p.flashcards, [id]: { box, due: Date.now() + BOX_INTERVAL_DAYS[box] * DAY } } };
      });
    },
    [setProgress],
  );

  const publishLesson = useCallback(
    (lesson: VideoLesson) => {
      setRecorded((r) => [lesson, ...r.filter((x) => x.id !== lesson.id)]);
      setProgress((p) => ({ ...p, library: Array.from(new Set([lesson.id, ...p.library])) }));
    },
    [setRecorded, setProgress],
  );

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const askTutor = useCallback((seed: TutorSeed) => {
    setTutorSeed(seed);
    setView("tutor");
  }, []);

  const clearTutorSeed = useCallback(() => setTutorSeed(null), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [setSettings]);

  const openLesson = useCallback((id: string) => {
    setActiveLessonId(id);
    setView("player");
  }, []);

  const value: AppState = {
    view, setView, activeLessonId, openLesson, progress, settings, updateSettings, lessons, publishLesson,
    toggleChapter, recordQuiz, addGoal, toggleGoal, gradeCard, completion, badges, online, celebrate,
    tutorSeed, askTutor, clearTutorSeed, toasts, notify, dismissToast, paletteOpen, setPaletteOpen,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
