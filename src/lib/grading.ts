import { SCHOOLS, UNIVERSITIES } from "../data/schools";
import type { School, University } from "../types";

export type Exam = "BECE" | "WASSCE";

export interface GradeBand {
  grade: number;
  label: string;
  min: number;
  descriptor: string;
}

/** BECE: grades 1 (best) to 9, by percentage score. */
export const BECE_BANDS: GradeBand[] = [
  { grade: 1, label: "1", min: 90, descriptor: "Highest" },
  { grade: 2, label: "2", min: 80, descriptor: "Higher" },
  { grade: 3, label: "3", min: 70, descriptor: "High" },
  { grade: 4, label: "4", min: 60, descriptor: "High average" },
  { grade: 5, label: "5", min: 50, descriptor: "Average" },
  { grade: 6, label: "6", min: 40, descriptor: "Low average" },
  { grade: 7, label: "7", min: 30, descriptor: "Low" },
  { grade: 8, label: "8", min: 20, descriptor: "Lower" },
  { grade: 9, label: "9", min: 0, descriptor: "Lowest" },
];

/** WASSCE: A1 (best) to F9, by percentage score. */
export const WASSCE_BANDS: GradeBand[] = [
  { grade: 1, label: "A1", min: 75, descriptor: "Excellent" },
  { grade: 2, label: "B2", min: 70, descriptor: "Very good" },
  { grade: 3, label: "B3", min: 65, descriptor: "Good" },
  { grade: 4, label: "C4", min: 60, descriptor: "Credit" },
  { grade: 5, label: "C5", min: 55, descriptor: "Credit" },
  { grade: 6, label: "C6", min: 50, descriptor: "Credit" },
  { grade: 7, label: "D7", min: 45, descriptor: "Pass" },
  { grade: 8, label: "E8", min: 40, descriptor: "Pass" },
  { grade: 9, label: "F9", min: 0, descriptor: "Fail" },
];

export const bandsFor = (exam: Exam): GradeBand[] =>
  exam === "BECE" ? BECE_BANDS : WASSCE_BANDS;

export function gradeFor(exam: Exam, percent: number): GradeBand {
  const p = Math.max(0, Math.min(100, percent));
  const bands = bandsFor(exam);
  return bands.find((b) => p >= b.min) ?? bands[bands.length - 1];
}

/**
 * Both examinations are aggregated from six subjects (best possible = 6,
 * worst = 54) with grade 1 best. BECE: 4 core + best 2 electives. WASSCE for
 * placement and admission: 3 core + best 3 electives.
 */
export const AGGREGATE_SUBJECTS = 6;
export const AGGREGATE_BEST = 6;
export const AGGREGATE_WORST = 54;

export interface ScoreEntry {
  subject: string;
  percent: number;
  core: boolean;
}

export interface AggregateResult {
  grades: { subject: string; percent: number; band: GradeBand; core: boolean; counted: boolean }[];
  aggregate: number | null;
  warning: string | null;
}

export function computeAggregate(exam: Exam, entries: ScoreEntry[]): AggregateResult {
  const graded = entries.map((e) => ({ ...e, band: gradeFor(exam, e.percent) }));
  const coreNeeded = exam === "BECE" ? 4 : 3;
  const core = graded.filter((g) => g.core).sort((a, b) => a.band.grade - b.band.grade);
  const elective = graded.filter((g) => !g.core).sort((a, b) => a.band.grade - b.band.grade);
  const electiveNeeded = AGGREGATE_SUBJECTS - coreNeeded;

  const countedCore = core.slice(0, coreNeeded);
  const countedElective = elective.slice(0, electiveNeeded);
  const counted = new Set([...countedCore, ...countedElective].map((g) => g.subject));

  const grades = graded.map((g) => ({
    subject: g.subject,
    percent: g.percent,
    band: g.band,
    core: g.core,
    counted: counted.has(g.subject),
  }));

  if (countedCore.length < coreNeeded || countedElective.length < electiveNeeded) {
    return {
      grades,
      aggregate: null,
      warning: `Enter at least ${coreNeeded} core and ${electiveNeeded} elective subjects to compute the ${exam} aggregate.`,
    };
  }
  const aggregate = [...countedCore, ...countedElective].reduce((n, g) => n + g.band.grade, 0);
  return { grades, aggregate, warning: null };
}

export interface Placement {
  schools: { category: "A" | "B" | "C"; list: School[] }[];
  universities: { eligible: University[]; stretch: University[] };
}

export function placementFor(aggregate: number): Placement {
  const eligible = (s: School) => aggregate <= s.maxAggregate;
  const schools = (["A", "B", "C"] as const).map((category) => ({
    category,
    list: SCHOOLS.filter((s) => s.category === category && eligible(s)),
  }));
  return {
    schools,
    universities: {
      eligible: UNIVERSITIES.filter((u) => aggregate <= u.maxAggregate),
      stretch: UNIVERSITIES.filter((u) => aggregate > u.maxAggregate && aggregate <= u.maxAggregate + 4),
    },
  };
}

export function remarkFor(exam: Exam, aggregate: number | null): string {
  if (aggregate === null) return "Complete all required subjects to receive a consultant remark.";
  if (aggregate <= 12) return "Outstanding performance. Maintain this discipline and aim for top programmes.";
  if (aggregate <= 24) return "Strong performance. Target the weaker electives to move into the top band.";
  if (aggregate <= 36) return `Solid foundation. Focus revision on the subjects with grades below 5 before the next ${exam} sitting.`;
  return "Significant room to grow. Work through the Pasco Lab daily and book a consultation for a revision plan.";
}
