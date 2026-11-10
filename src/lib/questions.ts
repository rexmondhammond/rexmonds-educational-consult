import { askOnce, extractJson } from "./ai";
import { groundingFor } from "./grounding";
import type { AQuestion, Level } from "../types";

const uid = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const LETTERS = "ABCD";

interface RawMcq { type?: string; prompt?: string; options?: unknown; workings?: string; answer?: string; marks?: number; explanation?: string; keyPoints?: unknown }

const text = (v: unknown, max = 500) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const sameText = (a: string, b: string) => a.toLowerCase().replace(/\W+/g, "") === b.toLowerCase().replace(/\W+/g, "");

function answerIndex(raw: unknown, options: string[]): number {
  const a = text(raw, 200);
  const m = a.match(/^\(?([A-D])\)?[.):\s]?/i);
  if (m && (a.length <= 3 || /^[A-D][.):]/i.test(a))) return LETTERS.indexOf(m[1].toUpperCase());
  return options.findIndex((o) => sameText(o, a));
}

interface Draft { prompt: string; options: string[]; correct: number; explanation: string; marks: number }

function parseMcq(r: RawMcq): Draft | null {
  const prompt = text(r.prompt, 600);
  if (prompt.length < 12 || !Array.isArray(r.options)) return null;
  const options = r.options.map((o) => text(o, 200).replace(/^[A-D][.)]\s+/i, "")).filter(Boolean);
  if (options.length !== 4) return null;
  if (new Set(options.map((o) => o.toLowerCase().replace(/\W+/g, ""))).size !== 4) return null;
  const correct = answerIndex(r.answer, options);
  if (correct < 0 || correct > 3) return null;
  return { prompt, options, correct, explanation: text(r.explanation, 700) || text(r.workings, 700), marks: Math.min(5, Math.max(1, Number(r.marks) || 2)) };
}

function shuffle<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export interface GenResult { questions: AQuestion[]; rejected: number; grounded: boolean }

/**
 * Generates exam questions that stay inside one subject and have verified answers.
 * 1) the model writes questions with workings, from the NaCCA reference for that chapter;
 * 2) a second, independent pass solves every question without seeing the answer;
 * 3) only questions where both passes agree are kept, then the options are shuffled.
 */
export async function generateQuestions(opts: { subject: string; topic: string; level: Level; count: number; tag: string; signal?: AbortSignal }): Promise<GenResult> {
  const { subject, topic, level, count, tag, signal } = opts;
  const ground = groundingFor(subject, topic, level);
  const lock = `Every question must be strictly about ${subject}, topic "${topic}". Do not include any content from another subject.`;
  const kept: Draft[] = [];
  let rejected = 0;
  let shortQ = null as AQuestion | null;

  for (let round = 0; round < 2 && kept.length < count; round++) {
    const need = count - kept.length;
    const avoid = kept.length ? `\nDo not repeat these questions:\n${kept.map((k) => `- ${k.prompt}`).join("\n")}` : "";
    const prompt = `${ground.text ? `${ground.text}\n\n` : ""}${lock}
Write ${Math.ceil(need * 1.4)} multiple-choice questions at ${level} level in WAEC style (clear stem, exactly 4 options, exactly one correct option, plausible wrong options based on real candidate mistakes). Where the topic involves calculation, work the answer out carefully first.
Return ONLY a JSON array. Each item: {"type":"mcq","prompt":string,"options":[4 strings without letters],"workings":string (your step-by-step working, written BEFORE the answer),"answer":"A"|"B"|"C"|"D","marks":2,"explanation":string (2 sentences for the student)}.${round === 0 && !shortQ ? `\nAlso add ONE final item {"type":"short","prompt":string,"keyPoints":[3-4 marking points],"marks":4,"explanation":string}.` : ""}
Use plain-text maths (x^2, 3/4). No markdown.${avoid}`;
    let parsed: RawMcq[] | null = null;
    try { parsed = extractJson<RawMcq[]>(await askOnce(prompt, "json", level, subject, signal, { context: "", temperature: 0.3 })); } catch (e) { if (round === 0) throw e; }
    if (!Array.isArray(parsed)) continue;

    const mcqs: Draft[] = [];
    for (const r of parsed) {
      if (r?.type === "short" && !shortQ && text(r.prompt).length > 12 && Array.isArray(r.keyPoints)) {
        shortQ = { id: uid(), type: "short", topic: tag, prompt: text(r.prompt, 600), keyPoints: (r.keyPoints as unknown[]).map((k) => text(k, 200)).filter(Boolean).slice(0, 6), marks: Math.min(10, Math.max(1, Number(r.marks) || 4)), explanation: text(r.explanation, 700) };
        continue;
      }
      const d = parseMcq(r);
      if (!d) { rejected++; continue; }
      if (kept.some((k) => sameText(k.prompt, d.prompt)) || mcqs.some((k) => sameText(k.prompt, d.prompt))) continue;
      mcqs.push(d);
    }
    if (!mcqs.length) continue;

    // independent check: solve each question blind and compare
    let verdicts: { id: number; answer: string }[] | null = null;
    try {
      const check = `${ground.text ? `${ground.text}\n\n` : ""}Solve each ${subject} question independently and carefully. Choose the single best option.
Return ONLY a JSON array: [{"id":number,"answer":"A"|"B"|"C"|"D"}].
${mcqs.map((q, i) => `${i}. ${q.prompt}\n${q.options.map((o, k) => `${LETTERS[k]}. ${o}`).join("\n")}`).join("\n\n")}`;
      verdicts = extractJson<{ id: number; answer: string }[]>(await askOnce(check, "json", level, subject, signal, { context: "", temperature: 0 }));
    } catch { /* if checking fails we keep nothing unverified */ }
    const map = new Map((verdicts ?? []).map((v) => [Number(v.id), text(v.answer, 3).replace(/\W/g, "").toUpperCase()]));
    mcqs.forEach((q, i) => {
      if (map.get(i) === LETTERS[q.correct]) kept.push(q); else rejected++;
    });
  }

  const final = kept.slice(0, count).map((q): AQuestion => {
    const order = shuffle([0, 1, 2, 3]);
    return { id: uid(), type: "mcq", topic: tag, prompt: q.prompt, options: order.map((i) => q.options[i]), correct: order.indexOf(q.correct), marks: q.marks, explanation: q.explanation };
  });
  return { questions: shortQ && final.length ? [...final, shortQ] : final, rejected, grounded: Boolean(ground.text) };
}
