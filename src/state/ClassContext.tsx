import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { SEED_ASSESSMENTS } from "../data/assessments";
import { ME_ID, STUDENTS } from "../data/cohort";
import { EMPTY_GRADING, scoreSubmission, simulatedSubmissions, type Result } from "../lib/assessment";
import { usePersistentState } from "../lib/storage";
import type { Assessment, Grading, Student, Submission } from "../types";
import { useApp } from "./AppContext";

interface Store {
  created: Assessment[];
  mine: Submission[];
  gradings: Record<string, Grading>;
}

const EMPTY: Store = { created: [], mine: [], gradings: {} };

interface ClassState {
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
}

const Ctx = createContext<ClassState | null>(null);

export function useClass(): ClassState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useClass must be used inside <ClassProvider>");
  return v;
}

export function ClassProvider({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  const [store, setStore] = usePersistentState<Store>("rex.class.v1", EMPTY);

  const assessments = useMemo(() => [...store.created, ...SEED_ASSESSMENTS], [store.created]);
  const published = useMemo(() => assessments.filter((a) => a.status === "published"), [assessments]);

  const me = useMemo<Student>(() => ({ id: ME_ID, name: settings.name ? `${settings.name} (you)` : "You", mastery: {}, attendance: 100, streak: 0 }), [settings.name]);
  const roster = useMemo(() => (store.mine.length ? [...STUDENTS, me] : STUDENTS), [store.mine.length, me]);

  const simulated = useMemo(() => simulatedSubmissions(published), [published]);
  const submissions = useMemo(() => [...store.mine, ...simulated], [store.mine, simulated]);

  const saveAssessment = useCallback(
    (a: Assessment) => setStore((s) => ({ ...s, created: [a, ...s.created.filter((x) => x.id !== a.id)] })),
    [setStore],
  );
  const deleteAssessment = useCallback(
    (id: string) => setStore((s) => ({ ...s, created: s.created.filter((x) => x.id !== id), mine: s.mine.filter((m) => m.assessmentId !== id) })),
    [setStore],
  );

  const submitMine = useCallback(
    (assessmentId: string, answers: Submission["answers"], timeSpentSec: number): Submission => {
      const sub: Submission = { id: `me-${assessmentId}-${Date.now()}`, assessmentId, studentId: ME_ID, answers, submittedAt: Date.now(), timeSpentSec };
      setStore((s) => ({ ...s, mine: [sub, ...s.mine.filter((m) => m.assessmentId !== assessmentId)] }));
      return sub;
    },
    [setStore],
  );

  const setGrading = useCallback(
    (submissionId: string, patch: Partial<Grading>) =>
      setStore((s) => {
        const cur = s.gradings[submissionId] ?? EMPTY_GRADING;
        return { ...s, gradings: { ...s.gradings, [submissionId]: { ...cur, ...patch, manual: { ...cur.manual, ...patch.manual }, comments: { ...cur.comments, ...patch.comments } } } };
      }),
    [setStore],
  );

  const resultFor = useCallback((a: Assessment, sub: Submission) => scoreSubmission(a, sub, store.gradings[sub.id] ?? EMPTY_GRADING), [store.gradings]);
  const submissionsFor = useCallback((id: string) => submissions.filter((s) => s.assessmentId === id), [submissions]);
  const myLatest = useCallback((id: string) => store.mine.find((m) => m.assessmentId === id), [store.mine]);
  const resetDemo = useCallback(() => setStore(EMPTY), [setStore]);

  const value: ClassState = {
    assessments, published, submissions, roster, gradings: store.gradings, me,
    saveAssessment, deleteAssessment, submitMine, setGrading, resultFor, submissionsFor, myLatest, resetDemo,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
