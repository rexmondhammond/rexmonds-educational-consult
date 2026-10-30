import { SUBJECTS } from "../data/curriculum";
import type { Level } from "../types";

const STOP = new Set(["the", "a", "an", "of", "and", "to", "in", "is", "are", "what", "how", "do", "does", "i", "me", "my", "for", "on", "explain", "about", "with", "can", "you", "please"]);

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Keyword search over the built-in curriculum so the tutor stays useful offline. */
export function offlineAnswer(query: string, level: Level): string {
  const terms = words(query);
  if (terms.length === 0) return "Type a topic such as *quadratic equations* or *photosynthesis* and I will look it up in the offline vault.";

  const hits: { score: number; subject: string; chapter: (typeof SUBJECTS)[number]["chapters"][number] }[] = [];
  for (const s of SUBJECTS) {
    for (const c of s.chapters) {
      const hay = `${c.title} ${c.keyIdeas.join(" ")} ${c.outcomes.join(" ")} ${c.example.problem}`.toLowerCase();
      let score = terms.reduce((n, t) => n + (hay.includes(t) ? (c.title.toLowerCase().includes(t) ? 3 : 1) : 0), 0);
      if (score > 0 && s.level === level) score += 1;
      if (score > 0) hits.push({ score, subject: s.name, chapter: c });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  const best = hits.slice(0, 2);
  if (best.length === 0) return "I could not find that topic in the offline vault. Try different keywords, or connect to the internet for the AI tutor.";

  return best
    .map(({ subject, chapter: c }) =>
      [
        `## ${subject}: ${c.title}`,
        "**Key ideas**",
        ...c.keyIdeas.map((k) => `- ${k}`),
        `**Worked example:** ${c.example.problem}`,
        ...c.example.steps.map((s, i) => `${i + 1}. ${s}`),
        `**Answer:** ${c.example.answer}`,
        `**Chief Examiner pitfall:** ${c.pitfall}`,
      ].join("\n"),
    )
    .join("\n\n");
}
