import { ME_ID, STUDENTS, TOPICS, hashString, mulberry32 } from "../data/cohort";
import type { AQuestion, Assessment, Grading, Student, Submission } from "../types";

export const EMPTY_GRADING: Grading = { manual: {}, comments: {}, feedback: "" };

export interface QResult {
  question: AQuestion;
  answer: number | string | undefined;
  score: number;
  max: number;
  suggested: boolean; // true when a short-answer score is an automatic suggestion rather than teacher-confirmed
  correct?: boolean;
}

export interface Result {
  total: number;
  max: number;
  pct: number;
  perQuestion: QResult[];
  pendingReview: number; // short answers not yet confirmed by a teacher
}

/** Share of key points that appear (loosely) in a written answer. Used only as a suggestion. */
export function keyPointCoverage(answer: string, keyPoints: string[]): number {
  const text = answer.toLowerCase();
  if (!keyPoints.length || !text.trim()) return 0;
  const hit = keyPoints.filter((k) => {
    const words = k.toLowerCase().split(/[^a-z0-9.%]+/).filter((w) => w.length > 2);
    if (words.length === 0) return text.includes(k.toLowerCase());
    return words.filter((w) => text.includes(w)).length / words.length >= 0.6;
  }).length;
  return hit / keyPoints.length;
}

export function suggestShortScore(q: AQuestion, answer: string): number {
  return Math.round(keyPointCoverage(answer, q.keyPoints ?? []) * q.marks * 2) / 2;
}

/** Earlier seeded tests are treated as already confirmed by the teacher so the demo queue stays realistic. */
export function autoConfirmed(a: Assessment, sub: Submission): boolean {
  return sub.id.startsWith("sim-") && a.source === "seed" && a.id !== "a-econ-1";
}

export function scoreSubmission(a: Assessment, sub: Submission, grading: Grading = EMPTY_GRADING): Result {
  let total = 0;
  let max = 0;
  let pending = 0;
  const perQuestion: QResult[] = a.questions.map((q) => {
    const answer = sub.answers[q.id];
    max += q.marks;
    if (q.type === "mcq") {
      const correct = typeof answer === "number" && answer === q.correct;
      const score = correct ? q.marks : 0;
      total += score;
      return { question: q, answer, score, max: q.marks, suggested: false, correct };
    }
    const manual = grading.manual[q.id];
    const text = typeof answer === "string" ? answer : "";
    const score = manual ?? suggestShortScore(q, text);
    const confirmed = manual !== undefined || autoConfirmed(a, sub);
    if (!confirmed) pending += 1;
    total += score;
    return { question: q, answer, score, max: q.marks, suggested: !confirmed };
  });
  return { total, max, pct: max ? Math.round((total / max) * 100) : 0, perQuestion, pendingReview: pending };
}

/** WASSCE-style grade bands. */
export function gradeFor(pct: number): { grade: string; label: string; tone: "emerald" | "cyan" | "amber" | "red" } {
  if (pct >= 75) return { grade: "A1", label: "Excellent", tone: "emerald" };
  if (pct >= 70) return { grade: "B2", label: "Very good", tone: "emerald" };
  if (pct >= 65) return { grade: "B3", label: "Good", tone: "cyan" };
  if (pct >= 60) return { grade: "C4", label: "Credit", tone: "cyan" };
  if (pct >= 55) return { grade: "C5", label: "Credit", tone: "cyan" };
  if (pct >= 50) return { grade: "C6", label: "Credit", tone: "amber" };
  if (pct >= 45) return { grade: "D7", label: "Pass", tone: "amber" };
  if (pct >= 40) return { grade: "E8", label: "Pass", tone: "amber" };
  return { grade: "F9", label: "Fail", tone: "red" };
}

/** Deterministic simulated submission for a class member so teacher analytics are populated. */
export function simulateSubmission(a: Assessment, student: Student): Submission | null {
  const rnd = mulberry32(hashString(`${a.id}:${student.id}`));
  if (a.source === "teacher" && rnd() < 0.25) return null; // some learners have not submitted a new test yet
  if (a.id === "a-econ-1" && rnd() < 0.18) return null;
  const answers: Record<string, number | string> = {};
  for (const q of a.questions) {
    const m = (student.mastery[q.topic] ?? 55) / 100;
    if (q.type === "mcq") {
      const options = q.options?.length ?? 4;
      const right = rnd() < Math.min(0.97, Math.max(0.08, m + 0.05));
      if (right) answers[q.id] = q.correct ?? 0;
      else {
        let w = Math.floor(rnd() * options);
        if (w === q.correct) w = (w + 1) % options;
        answers[q.id] = w;
      }
    } else {
      const kp = q.keyPoints ?? [];
      const included = kp.filter(() => rnd() < Math.min(0.95, m + 0.1));
      answers[q.id] = included.length ? `${included.join("; ")}.` : "I am not sure how to answer this.";
    }
  }
  return {
    id: `sim-${a.id}-${student.id}`,
    assessmentId: a.id,
    studentId: student.id,
    answers,
    submittedAt: a.createdAt + Math.round((1 + rnd() * 2) * 86_400_000),
    timeSpentSec: Math.round(a.durationMin * 60 * (0.55 + rnd() * 0.4)),
  };
}

export function simulatedSubmissions(assessments: Assessment[]): Submission[] {
  const out: Submission[] = [];
  for (const a of assessments) {
    if (a.status !== "published") continue;
    for (const s of STUDENTS) {
      const sub = simulateSubmission(a, s);
      if (sub) out.push(sub);
    }
  }
  return out;
}

export interface ClassStats {
  submitted: number;
  total: number;
  mean: number;
  median: number;
  highest: number;
  lowest: number;
  passRate: number;
  distribution: number[]; // counts for 0-9, 10-19 ... 90-100
}

export function classStats(pcts: number[], enrolled = STUDENTS.length): ClassStats {
  const sorted = [...pcts].sort((a, b) => a - b);
  const n = sorted.length;
  const distribution = Array<number>(10).fill(0);
  sorted.forEach((p) => { distribution[Math.min(9, Math.floor(p / 10))] += 1; });
  return {
    submitted: n,
    total: enrolled,
    mean: n ? Math.round(sorted.reduce((s, p) => s + p, 0) / n) : 0,
    median: n ? Math.round(n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2) : 0,
    highest: n ? sorted[n - 1] : 0,
    lowest: n ? sorted[0] : 0,
    passRate: n ? Math.round((sorted.filter((p) => p >= 50).length / n) * 100) : 0,
    distribution,
  };
}

export interface ItemStat {
  question: AQuestion;
  pctCorrect: number; // average score as a percentage of marks
  attempts: number;
  commonWrong?: { option: string; share: number };
  flag?: "too-hard" | "too-easy";
}

export function itemAnalysis(a: Assessment, subs: Submission[], gradings: Record<string, Grading>): ItemStat[] {
  return a.questions.map((q) => {
    let earned = 0;
    let max = 0;
    const wrong: Record<number, number> = {};
    for (const sub of subs) {
      const g = gradings[sub.id] ?? EMPTY_GRADING;
      const r = scoreSubmission(a, sub, g).perQuestion.find((x) => x.question.id === q.id);
      if (!r) continue;
      earned += r.score;
      max += r.max;
      if (q.type === "mcq" && !r.correct && typeof r.answer === "number") wrong[r.answer] = (wrong[r.answer] ?? 0) + 1;
    }
    const pct = max ? Math.round((earned / max) * 100) : 0;
    const wrongEntries = Object.entries(wrong).sort((x, y) => y[1] - x[1]);
    const totalWrong = wrongEntries.reduce((s, [, n]) => s + n, 0);
    const top = wrongEntries[0];
    return {
      question: q,
      pctCorrect: pct,
      attempts: subs.length,
      commonWrong: top && q.options ? { option: q.options[Number(top[0])], share: Math.round((top[1] / Math.max(1, totalWrong)) * 100) } : undefined,
      flag: subs.length >= 5 ? (pct < 35 ? "too-hard" : pct > 92 ? "too-easy" : undefined) : undefined,
    };
  });
}

/** Mastery by topic for one student: blends their baseline with what the submissions show. */
export function studentTopicMastery(
  student: Student,
  subs: Submission[],
  assessments: Assessment[],
  gradings: Record<string, Grading>,
): Record<string, { pct: number; evidence: number }> {
  const byA = new Map(assessments.map((a) => [a.id, a]));
  const earned: Record<string, number> = {};
  const max: Record<string, number> = {};
  for (const sub of subs) {
    if (sub.studentId !== student.id) continue;
    const a = byA.get(sub.assessmentId);
    if (!a) continue;
    const r = scoreSubmission(a, sub, gradings[sub.id] ?? EMPTY_GRADING);
    for (const q of r.perQuestion) {
      earned[q.question.topic] = (earned[q.question.topic] ?? 0) + q.score;
      max[q.question.topic] = (max[q.question.topic] ?? 0) + q.max;
    }
  }
  const out: Record<string, { pct: number; evidence: number }> = {};
  const topics = new Set<string>([...TOPICS, ...Object.keys(max)]);
  topics.forEach((t) => {
    const base = student.mastery[t];
    if (max[t] && base !== undefined) {
      // Blend with the learner's baseline so one or two questions cannot swing a topic to 0 or 100.
      const prior = 6;
      out[t] = { pct: Math.round(((earned[t] + (base / 100) * prior) / (max[t] + prior)) * 100), evidence: max[t] };
    } else if (max[t]) out[t] = { pct: Math.round((earned[t] / max[t]) * 100), evidence: max[t] };
    else if (base !== undefined) out[t] = { pct: base, evidence: 0 };
  });
  return out;
}

export interface Reco {
  id: string;
  tone: "red" | "amber" | "cyan" | "emerald";
  title: string;
  detail: string;
  action?: { label: string; kind: "tutor" | "vault" | "pasco" | "assessments" | "build" | "grades"; prompt?: string; subject?: string };
}

export const TOPIC_TO_SUBJECT: Record<string, string> = {
  Algebra: "Core Mathematics", Geometry: "Core Mathematics", Statistics: "Core Mathematics",
  Mechanics: "Physics", Electricity: "Physics", "Chemical bonding": "Chemistry", "Cell biology": "Biology", Economics: "Economics",
};

const STRATEGY: Record<string, string> = {
  Algebra: "Re-teach with balance-scale models and 5 quick factorisation drills.",
  Geometry: "Use paper folding and measured diagrams; practise angle rules with 3 mixed problems.",
  Statistics: "Run a class survey and compute mean, median and mode from real data.",
  Mechanics: "Demonstrate F = ma with a trolley or bottle-cap race and have learners predict first.",
  Electricity: "Build a series and parallel circuit with torch bulbs; compare brightness before explaining.",
  "Chemical bonding": "Use dot-and-cross diagrams on the board and a salt versus sugar conductivity demo.",
  "Cell biology": "Label cell diagrams in pairs and play an organelle-function matching game.",
  Economics: "Role-play a market with price changes to feel demand and supply shifts.",
};

/** Personalised next steps for a learner, driven by their evidence. */
export function studentRecommendations(
  mastery: Record<string, { pct: number; evidence: number }>,
  pendingAssessments: number,
  dueCards: number,
): Reco[] {
  const out: Reco[] = [];
  if (pendingAssessments > 0) {
    out.push({
      id: "pending", tone: "amber", title: `${pendingAssessments} assessment${pendingAssessments > 1 ? "s" : ""} waiting`,
      detail: "Your teacher has assigned work. Completing it keeps your growth profile accurate.",
      action: { label: "Open assessments", kind: "assessments" },
    });
  }
  const assessed = Object.entries(mastery).filter(([, v]) => v.evidence > 0).sort((a, b) => a[1].pct - b[1].pct);
  const weak = assessed.filter(([, v]) => v.pct < 60).slice(0, 2);
  for (const [topic, v] of weak) {
    out.push({
      id: `weak-${topic}`, tone: v.pct < 40 ? "red" : "amber", title: `Strengthen ${topic} (${v.pct}%)`,
      detail: `Review the ${TOPIC_TO_SUBJECT[topic] ?? "subject"} chapter, then ask the AI tutor to quiz you until you score above 70%.`,
      action: { label: "Quiz me with AI", kind: "tutor", prompt: `Quiz me on ${topic}. Start easy and get harder.`, subject: TOPIC_TO_SUBJECT[topic] },
    });
  }
  const strong = assessed.filter(([, v]) => v.pct >= 80).slice(-1)[0];
  if (strong) {
    out.push({
      id: `strong-${strong[0]}`, tone: "emerald", title: `${strong[0]} is a strength (${strong[1].pct}%)`,
      detail: "Stretch yourself with past WASSCE questions to lock in an A1.",
      action: { label: "Try past questions", kind: "pasco" },
    });
  }
  if (dueCards > 0) {
    out.push({ id: "cards", tone: "cyan", title: `${dueCards} flashcards are due`, detail: "A five-minute review today beats a one-hour cram later.", action: { label: "Review on Home", kind: "vault" } });
  }
  if (out.length === 0) {
    out.push({ id: "start", tone: "cyan", title: "Take your first assessment", detail: "Results unlock personalised recommendations for the topics you need most.", action: { label: "Open assessments", kind: "assessments" } });
  }
  return out;
}

/** Teacher-facing recommendations from class analytics. */
export function teacherRecommendations(
  topicAverages: { topic: string; avg: number }[],
  studentAverages: { student: Student; avg: number; trend: number }[],
  flaggedItems: { assessment: string; item: ItemStat }[],
  needsGrading: number,
): Reco[] {
  const out: Reco[] = [];
  if (needsGrading > 0) {
    out.push({ id: "grade", tone: "amber", title: `${needsGrading} written answer${needsGrading > 1 ? "s" : ""} to confirm`, detail: "Auto-suggested marks are provisional until you confirm them.", action: { label: "Open gradebook", kind: "grades" } });
  }
  topicAverages.filter((t) => t.avg < 60).sort((a, b) => a.avg - b.avg).slice(0, 2).forEach((t) => {
    out.push({
      id: `reteach-${t.topic}`, tone: t.avg < 45 ? "red" : "amber", title: `Re-teach ${t.topic} (class average ${t.avg}%)`,
      detail: STRATEGY[t.topic] ?? "Plan a short re-teach followed by a retest.",
      action: { label: "Draft lesson plan with AI", kind: "tutor", prompt: `Create a 40-minute re-teaching lesson plan on ${t.topic} for SHS 2. The class average was ${t.avg}%.`, subject: TOPIC_TO_SUBJECT[t.topic] },
    });
  });
  const atRisk = studentAverages.filter((s) => s.avg < 50).sort((a, b) => a.avg - b.avg);
  if (atRisk.length) {
    out.push({
      id: "at-risk", tone: "red", title: `${atRisk.length} learner${atRisk.length > 1 ? "s" : ""} below the pass mark`,
      detail: `Start with ${atRisk.slice(0, 3).map((s) => s.student.name.split(" ")[0]).join(", ")}. Pair with a stronger peer and set a short weekly target.`,
    });
  }
  const falling = studentAverages.filter((s) => s.trend <= -10).slice(0, 3);
  if (falling.length) {
    out.push({ id: "falling", tone: "amber", title: "Scores are slipping", detail: `${falling.map((s) => s.student.name.split(" ")[0]).join(", ")} dropped 10+ points on the latest test. A quick check-in may help.` });
  }
  const top = studentAverages.filter((s) => s.avg >= 80);
  if (top.length) {
    out.push({ id: "extend", tone: "emerald", title: `${top.length} high achiever${top.length > 1 ? "s" : ""} ready for extension`, detail: "Give past-WASSCE challenge questions or ask them to explain solutions to peers." });
  }
  flaggedItems.slice(0, 2).forEach(({ assessment, item }) => {
    out.push({
      id: `item-${item.question.id}`, tone: "cyan",
      title: item.flag === "too-hard" ? "A question looks too hard or unclear" : "A question may be too easy",
      detail: `"${item.question.prompt.slice(0, 80)}${item.question.prompt.length > 80 ? "…" : ""}" in ${assessment} was answered correctly by ${item.pctCorrect}%. Review the wording and the options.`,
    });
  });
  if (out.length === 0) out.push({ id: "ok", tone: "emerald", title: "The class is on track", detail: "No urgent actions. Consider publishing a new assessment to keep momentum.", action: { label: "Create assessment", kind: "build" } });
  return out;
}

export { ME_ID };
