import { SUBJECTS } from "../data/curriculum";
import type { Chapter, Level, Subject } from "../types";

const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "what", "how", "are", "you", "can", "about", "explain", "solve", "find", "give", "make", "create", "questions", "question", "lesson", "topic", "ghana", "waec", "bece", "wassce", "exam", "style", "plain", "text", "json", "return", "only", "array", "each", "item", "type", "mcq", "short", "options", "correct", "marks", "explanation"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Finds the curriculum subject a name refers to (exact first, then close), within a level when known. */
export function findSubject(name: string, level?: Level): Subject | null {
  const n = norm(name);
  if (!n) return null;
  const pool = SUBJECTS.filter((s) => !level || s.level === level);
  return pool.find((s) => norm(s.name) === n) ?? SUBJECTS.find((s) => norm(s.name) === n) ?? pool.find((s) => norm(s.name).includes(n) || n.includes(norm(s.name))) ?? null;
}

export interface Ground { subject: Subject | null; chapters: Chapter[]; text: string }

/**
 * Builds a reference block from the NaCCA vault for the chosen subject and topic.
 * The AI is told to teach from this, which keeps it on the right subject and syllabus.
 */
export function groundingFor(subjectName: string, topic: string, level?: Level): Ground {
  let subject = findSubject(subjectName, level);
  const terms = words(topic);
  if (!subject && terms.length) {
    // no subject chosen: infer it from the topic words
    let best: { s: Subject; score: number } | null = null;
    for (const s of SUBJECTS) {
      if (level && s.level !== level) continue;
      const score = s.chapters.reduce((n, c) => n + (terms.some((t) => `${c.title} ${c.keyIdeas.join(" ")}`.toLowerCase().includes(t)) ? 1 : 0), 0);
      if (score > 0 && (!best || score > best.score)) best = { s, score };
    }
    if (best && best.score >= 2) subject = best.s;
  }
  if (!subject) return { subject: null, chapters: [], text: "" };

  const scored = subject.chapters
    .map((c) => {
      const hay = `${c.title} ${c.outcomes.join(" ")} ${c.keyIdeas.join(" ")}`.toLowerCase();
      return { c, score: terms.reduce((n, t) => n + (hay.includes(t) ? (c.title.toLowerCase().includes(t) ? 3 : 1) : 0), 0) };
    })
    .sort((a, b) => b.score - a.score);
  const chapters = scored.filter((x) => x.score > 0).slice(0, 2).map((x) => x.c);
  const lines = [`Reference material for ${subject.name} (${subject.level}, syllabus ${subject.syllabusCode}). Stay inside this subject.`];
  for (const c of chapters) {
    lines.push(`Chapter ${c.code}: ${c.title}`, `Outcomes: ${c.outcomes.join("; ")}`, `Key ideas: ${c.keyIdeas.join(" | ")}`, `Worked example: ${c.example.problem} Steps: ${c.example.steps.join(" -> ")} Answer: ${c.example.answer}`, `Common candidate mistake: ${c.pitfall}`);
  }
  if (!chapters.length) lines.push(`Chapters in this subject: ${subject.chapters.map((c) => c.title).join("; ")}`);
  return { subject, chapters, text: lines.join("\n").slice(0, 3200) };
}
