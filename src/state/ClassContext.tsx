import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SEED_ASSESSMENTS } from "../data/assessments";
import { ME_ID, STUDENTS } from "../data/cohort";
import { EMPTY_GRADING, scoreSubmission, simulatedSubmissions, type Result } from "../lib/assessment";
import { supabase } from "../lib/supabase";
import { usePersistentState } from "../lib/storage";
import type { AQuestion, Assessment, Grading, Level, Student, Submission } from "../types";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";

export interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  level: Level;
  joinCode: string;
  teacherId: string;
  teacherName: string;
}

export interface Announcement { id: string; body: string; createdAt: number }

export interface ClassState {
  cloud: boolean;
  loading: boolean;
  error: string | null;
  classes: ClassInfo[];
  activeClass: ClassInfo | null;
  setActiveClassId: (id: string) => void;
  createClass: (input: { name: string; subject: string; level: Level }) => Promise<string | null>;
  joinClass: (code: string) => Promise<string | null>;
  deleteClass: (id: string) => Promise<void>;
  announcements: Announcement[];
  postAnnouncement: (body: string) => Promise<void>;
  assessments: Assessment[];
  published: Assessment[];
  submissions: Submission[];
  roster: Student[];
  gradings: Record<string, Grading>;
  me: Student;
  saveAssessment: (a: Assessment) => void;
  deleteAssessment: (id: string) => void;
  submitMine: (assessmentId: string, answers: Submission["answers"], timeSpentSec: number) => Submission;
  setGrading: (submissionId: string, patch: Partial<Grading>) => void;
  resultFor: (a: Assessment, sub: Submission) => Result;
  submissionsFor: (assessmentId: string) => Submission[];
  myLatest: (assessmentId: string) => Submission | undefined;
  resetDemo: () => void;
  refresh: () => void;
}

const Ctx = createContext<ClassState | null>(null);

export function useClass(): ClassState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useClass must be used inside <ClassProvider>");
  return v;
}

const noopAsync = async () => null;

export function ClassProvider({ children }: { children: ReactNode }) {
  const { mode } = useAuth();
  return mode === "cloud" ? <CloudProvider>{children}</CloudProvider> : <DemoProvider>{children}</DemoProvider>;
}

/* ───────────────────────────── Demo (simulated class, browser storage) ───────────────────────────── */

interface Store { created: Assessment[]; mine: Submission[]; gradings: Record<string, Grading> }
const EMPTY: Store = { created: [], mine: [], gradings: {} };

function DemoProvider({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  const [store, setStore] = usePersistentState<Store>("rex.class.v1", EMPTY);

  const assessments = useMemo(() => [...store.created, ...SEED_ASSESSMENTS], [store.created]);
  const published = useMemo(() => assessments.filter((a) => a.status === "published"), [assessments]);
  const me = useMemo<Student>(() => ({ id: ME_ID, name: settings.name ? `${settings.name} (you)` : "You", mastery: {}, attendance: 100, streak: 0 }), [settings.name]);
  const roster = useMemo(() => (store.mine.length ? [...STUDENTS, me] : STUDENTS), [store.mine.length, me]);
  const simulated = useMemo(() => simulatedSubmissions(published), [published]);
  const submissions = useMemo(() => [...store.mine, ...simulated], [store.mine, simulated]);

  const saveAssessment = useCallback((a: Assessment) => setStore((s) => ({ ...s, created: [a, ...s.created.filter((x) => x.id !== a.id)] })), [setStore]);
  const deleteAssessment = useCallback((id: string) => setStore((s) => ({ ...s, created: s.created.filter((x) => x.id !== id), mine: s.mine.filter((m) => m.assessmentId !== id) })), [setStore]);
  const submitMine = useCallback((assessmentId: string, answers: Submission["answers"], timeSpentSec: number): Submission => {
    const sub: Submission = { id: `me-${assessmentId}-${Date.now()}`, assessmentId, studentId: ME_ID, answers, submittedAt: Date.now(), timeSpentSec };
    setStore((s) => ({ ...s, mine: [sub, ...s.mine.filter((m) => m.assessmentId !== assessmentId)] }));
    return sub;
  }, [setStore]);
  const setGrading = useCallback((submissionId: string, patch: Partial<Grading>) => setStore((s) => {
    const cur = s.gradings[submissionId] ?? EMPTY_GRADING;
    return { ...s, gradings: { ...s.gradings, [submissionId]: { ...cur, ...patch, manual: { ...cur.manual, ...patch.manual }, comments: { ...cur.comments, ...patch.comments } } } };
  }), [setStore]);
  const resultFor = useCallback((a: Assessment, sub: Submission) => scoreSubmission(a, sub, store.gradings[sub.id] ?? EMPTY_GRADING), [store.gradings]);
  const submissionsFor = useCallback((id: string) => submissions.filter((s) => s.assessmentId === id), [submissions]);
  const myLatest = useCallback((id: string) => store.mine.find((m) => m.assessmentId === id), [store.mine]);
  const resetDemo = useCallback(() => setStore(EMPTY), [setStore]);

  const value: ClassState = {
    cloud: false, loading: false, error: null, classes: [], activeClass: null, setActiveClassId: () => undefined,
    createClass: noopAsync, joinClass: noopAsync, deleteClass: async () => undefined, announcements: [], postAnnouncement: async () => undefined,
    assessments, published, submissions, roster, gradings: store.gradings, me,
    saveAssessment, deleteAssessment, submitMine, setGrading, resultFor, submissionsFor, myLatest, resetDemo, refresh: () => undefined,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ───────────────────────────── Cloud (Supabase) ───────────────────────────── */

interface ClassRow { id: string; name: string; subject: string; level: Level; join_code: string; teacher_id: string; teacher: { name: string } | null }
interface AssessmentRow { id: string; class_id: string; title: string; subject: string; level: Level; duration_min: number; status: "draft" | "published"; questions: AQuestion[]; created_at: string }
interface SubmissionRow { id: string; assessment_id: string; student_id: string; answers: Submission["answers"]; time_spent_sec: number; submitted_at: string }
interface GradingRow { submission_id: string; manual: Record<string, number>; comments: Record<string, string>; feedback: string }

const toAssessment = (r: AssessmentRow, className: string): Assessment => ({
  id: r.id, title: r.title, subject: r.subject, level: r.level, className, durationMin: r.duration_min,
  createdAt: new Date(r.created_at).getTime(), status: r.status, source: "teacher", questions: r.questions ?? [],
});
const toSubmission = (r: SubmissionRow): Submission => ({
  id: r.id, assessmentId: r.assessment_id, studentId: r.student_id, answers: r.answers ?? {}, submittedAt: new Date(r.submitted_at).getTime(), timeSpentSec: r.time_spent_sec,
});

function CloudProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { notify } = useApp();
  const userId = profile?.id ?? "";
  const isTeacher = profile?.role === "teacher";

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [activeId, setActiveId] = usePersistentState<{ id: string }>(`rex.activeClass.${userId}`, { id: "" });
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradings, setGradings] = useState<Record<string, Grading>>({});
  const [roster, setRoster] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const activeClass = useMemo(() => classes.find((c) => c.id === activeId.id) ?? classes[0] ?? null, [classes, activeId.id]);
  const activeClassId = activeClass?.id ?? "";

  const me = useMemo<Student>(() => ({ id: userId, name: profile?.name ?? "You", mastery: {}, attendance: 100, streak: 0 }), [userId, profile?.name]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Classes the user teaches or has joined.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void (async () => {
      const { data, error: err } = await supabase.from("classes").select("id, name, subject, level, join_code, teacher_id, teacher:profiles!classes_teacher_id_fkey(name)").order("created_at", { ascending: false });
      if (!alive) return;
      if (err) { setError(err.message); setLoading(false); return; }
      setClasses(((data ?? []) as unknown as ClassRow[]).map((c) => ({ id: c.id, name: c.name, subject: c.subject, level: c.level, joinCode: c.join_code, teacherId: c.teacher_id, teacherName: c.teacher?.name ?? "" })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId, tick]);

  // Everything for the active class.
  useEffect(() => {
    if (!activeClassId || !activeClass) { setAssessments([]); setSubmissions([]); setGradings({}); setRoster([]); setAnnouncements([]); return; }
    let alive = true;
    void (async () => {
      const [a, ann, enr] = await Promise.all([
        supabase.from("assessments").select("id, class_id, title, subject, level, duration_min, status, questions, created_at").eq("class_id", activeClassId).order("created_at", { ascending: false }),
        supabase.from("announcements").select("id, body, created_at").eq("class_id", activeClassId).order("created_at", { ascending: false }).limit(20),
        supabase.from("enrollments").select("student_id, profiles(id, name)").eq("class_id", activeClassId),
      ]);
      if (!alive) return;
      const rows = (a.data ?? []) as unknown as AssessmentRow[];
      setAssessments(rows.map((r) => toAssessment(r, activeClass.name)));
      setAnnouncements(((ann.data ?? []) as { id: string; body: string; created_at: string }[]).map((x) => ({ id: x.id, body: x.body, createdAt: new Date(x.created_at).getTime() })));
      const enrolled = ((enr.data ?? []) as unknown as { student_id: string; profiles: { id: string; name: string } | null }[]).map((e) => ({
        id: e.student_id, name: e.profiles?.name || "Learner", mastery: {}, attendance: 100, streak: 0,
      }));
      setRoster(isTeacher ? enrolled : [me]);
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) { setSubmissions([]); setGradings({}); return; }
      const subs = await supabase.from("submissions").select("id, assessment_id, student_id, answers, time_spent_sec, submitted_at").in("assessment_id", ids);
      if (!alive) return;
      const subRows = (subs.data ?? []) as SubmissionRow[];
      setSubmissions(subRows.map(toSubmission));
      if (subRows.length === 0) { setGradings({}); return; }
      const g = await supabase.from("gradings").select("submission_id, manual, comments, feedback").in("submission_id", subRows.map((s) => s.id));
      if (!alive) return;
      const map: Record<string, Grading> = {};
      ((g.data ?? []) as GradingRow[]).forEach((x) => { map[x.submission_id] = { manual: x.manual ?? {}, comments: x.comments ?? {}, feedback: x.feedback ?? "" }; });
      setGradings(map);
    })();
    return () => { alive = false; };
  }, [activeClassId, activeClass, isTeacher, me, tick]);

  // Live updates: refetch (debounced) when anything in this class changes.
  useEffect(() => {
    if (!activeClassId) return;
    let timer: number | undefined;
    const bump = () => { window.clearTimeout(timer); timer = window.setTimeout(() => setTick((t) => t + 1), 600); };
    const ch = supabase.channel(`class-${activeClassId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assessments", filter: `class_id=eq.${activeClassId}` }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "gradings" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements", filter: `class_id=eq.${activeClassId}` }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments", filter: `class_id=eq.${activeClassId}` }, bump)
      .subscribe();
    return () => { window.clearTimeout(timer); void supabase.removeChannel(ch); };
  }, [activeClassId]);

  const published = useMemo(() => assessments.filter((a) => a.status === "published"), [assessments]);

  const createClass = useCallback(async (input: { name: string; subject: string; level: Level }) => {
    const { data, error: err } = await supabase.from("classes").insert({ name: input.name.trim(), subject: input.subject.trim(), level: input.level, teacher_id: userId }).select("id").single();
    if (err) return err.message;
    setActiveId({ id: (data as { id: string }).id });
    refresh();
    return null;
  }, [userId, refresh, setActiveId]);

  const joinClass = useCallback(async (code: string) => {
    const { data, error: err } = await supabase.rpc("join_class", { code });
    if (err) return err.message;
    const row = data as { id: string } | null;
    if (row?.id) setActiveId({ id: row.id });
    refresh();
    return null;
  }, [refresh, setActiveId]);

  const deleteClass = useCallback(async (id: string) => {
    const { error: err } = await supabase.from("classes").delete().eq("id", id);
    if (err) notify(err.message, "warn");
    refresh();
  }, [notify, refresh]);

  const postAnnouncement = useCallback(async (body: string) => {
    if (!activeClassId || !body.trim()) return;
    const { error: err } = await supabase.from("announcements").insert({ class_id: activeClassId, author_id: userId, body: body.trim().slice(0, 2000) });
    if (err) notify(err.message, "warn"); else refresh();
  }, [activeClassId, userId, notify, refresh]);

  const saveAssessment = useCallback((a: Assessment) => {
    if (!activeClassId) return;
    setAssessments((cur) => [{ ...a, className: activeClass?.name ?? "" }, ...cur.filter((x) => x.id !== a.id)]);
    void supabase.from("assessments").upsert({
      id: a.id, class_id: activeClassId, title: a.title, subject: a.subject, level: a.level, duration_min: a.durationMin, status: a.status, questions: a.questions,
    }).then(({ error: err }) => { if (err) notify(`Could not save: ${err.message}`, "warn"); });
  }, [activeClassId, activeClass?.name, notify]);

  const deleteAssessment = useCallback((id: string) => {
    setAssessments((cur) => cur.filter((x) => x.id !== id));
    void supabase.from("assessments").delete().eq("id", id).then(({ error: err }) => { if (err) notify(err.message, "warn"); });
  }, [notify]);

  const submitMine = useCallback((assessmentId: string, answers: Submission["answers"], timeSpentSec: number): Submission => {
    const sub: Submission = { id: crypto.randomUUID(), assessmentId, studentId: userId, answers, submittedAt: Date.now(), timeSpentSec };
    setSubmissions((cur) => [sub, ...cur.filter((s) => !(s.assessmentId === assessmentId && s.studentId === userId))]);
    void supabase.from("submissions").upsert({ assessment_id: assessmentId, student_id: userId, answers, time_spent_sec: timeSpentSec, submitted_at: new Date().toISOString() }, { onConflict: "assessment_id,student_id" })
      .select("id").single().then(({ data, error: err }) => {
        if (err) { notify(`Submission could not be saved: ${err.message}`, "warn"); return; }
        const realId = (data as { id: string }).id;
        setSubmissions((cur) => cur.map((s) => (s.id === sub.id ? { ...s, id: realId } : s)));
      });
    return sub;
  }, [userId, notify]);

  const pending = useRef<Record<string, number>>({});
  const setGrading = useCallback((submissionId: string, patch: Partial<Grading>) => {
    setGradings((cur) => {
      const base = cur[submissionId] ?? EMPTY_GRADING;
      const next: Grading = { ...base, ...patch, manual: { ...base.manual, ...patch.manual }, comments: { ...base.comments, ...patch.comments } };
      window.clearTimeout(pending.current[submissionId]);
      pending.current[submissionId] = window.setTimeout(() => {
        void supabase.from("gradings").upsert({ submission_id: submissionId, manual: next.manual, comments: next.comments, feedback: next.feedback, updated_at: new Date().toISOString() })
          .then(({ error: err }) => { if (err) notify(`Grade not saved: ${err.message}`, "warn"); });
      }, 600);
      return { ...cur, [submissionId]: next };
    });
  }, [notify]);

  const resultFor = useCallback((a: Assessment, sub: Submission) => scoreSubmission(a, sub, gradings[sub.id] ?? EMPTY_GRADING), [gradings]);
  const submissionsFor = useCallback((id: string) => submissions.filter((s) => s.assessmentId === id), [submissions]);
  const myLatest = useCallback((id: string) => submissions.find((s) => s.assessmentId === id && s.studentId === userId), [submissions, userId]);

  const value: ClassState = {
    cloud: true, loading, error, classes, activeClass, setActiveClassId: (id) => setActiveId({ id }),
    createClass, joinClass, deleteClass, announcements, postAnnouncement,
    assessments, published, submissions, roster, gradings, me,
    saveAssessment, deleteAssessment, submitMine, setGrading, resultFor, submissionsFor, myLatest, resetDemo: () => undefined, refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
