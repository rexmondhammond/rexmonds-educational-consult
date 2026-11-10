import { SUBJECTS } from "../data/curriculum";
import { askOnce, extractJson } from "./ai";
import { groundingFor } from "./grounding";
import type { Level } from "../types";

export type SlideKind = "title" | "objectives" | "hook" | "concept" | "example" | "diagram" | "activity" | "check" | "mistakes" | "summary" | "homework";
export type DiagramKind = "none" | "cartesian" | "parabola" | "unit-circle" | "bohr" | "right-triangle" | "number-line";

export interface Slide {
  id: string;
  kind: SlideKind;
  title: string;
  bullets: string[];
  notes: string;
  diagram: DiagramKind;
  example?: { problem: string; steps: string[]; answer: string };
  question?: { prompt: string; options?: string[]; answer: string };
}

export interface Deck {
  id: string;
  topic: string;
  subject: string;
  level: Level;
  slides: Slide[];
  createdAt: number;
  source: "ai" | "curriculum";
}

export const KINDS: SlideKind[] = ["title", "objectives", "hook", "concept", "example", "diagram", "activity", "check", "mistakes", "summary", "homework"];
const DIAGRAMS: DiagramKind[] = ["none", "cartesian", "parabola", "unit-circle", "bohr", "right-triangle", "number-line"];

const uid = () => crypto.randomUUID();
const str = (v: unknown, max = 600) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strList = (v: unknown, maxItems = 8, max = 400) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, maxItems) : []);

interface RawSlide { kind?: string; title?: string; bullets?: unknown; notes?: string; diagram?: string; example?: { problem?: string; steps?: unknown; answer?: string }; question?: { prompt?: string; options?: unknown; answer?: string }; focus?: string }

export function normaliseSlide(r: RawSlide, fallbackKind: SlideKind = "concept"): Slide {
  const kind = (KINDS as string[]).includes(r.kind ?? "") ? (r.kind as SlideKind) : fallbackKind;
  const slide: Slide = {
    id: uid(), kind, title: str(r.title, 120) || "Untitled slide", bullets: strList(r.bullets), notes: str(r.notes, 1500),
    diagram: (DIAGRAMS as string[]).includes(r.diagram ?? "") ? (r.diagram as DiagramKind) : "none",
  };
  if (r.example && (r.example.problem || r.example.answer)) slide.example = { problem: str(r.example.problem), steps: strList(r.example.steps, 10), answer: str(r.example.answer) };
  if (r.question && r.question.prompt) {
    const options = strList(r.question.options, 5, 200);
    slide.question = { prompt: str(r.question.prompt), options: options.length >= 2 ? options : undefined, answer: str(r.question.answer) };
  }
  return slide;
}

export const SIZES = [
  { id: 12, label: "Standard (12 slides)" },
  { id: 18, label: "Detailed (18 slides)" },
  { id: 24, label: "Extended (24 slides)" },
] as const;

export interface Progress { done: number; total: number; message: string }

/** Plans an outline, then writes the slides in batches so each one is long and specific. */
export async function generateDeck(
  opts: { topic: string; subject: string; level: Level; count: number; onProgress: (p: Progress) => void; signal?: AbortSignal },
): Promise<Deck> {
  const { topic, subject, level, count, onProgress, signal } = opts;
  const ground = groundingFor(subject, topic, level);
  const subj = subject || ground.subject?.name || "";
  const ctx = `${level === "SHS" ? "SHS (WASSCE)" : "JHS (BECE)"} ${subj || "general"} for Ghana's NaCCA/GES curriculum`;
  const extra = { context: ground.text, temperature: 0.3 };
  const lock = subj ? ` Everything must belong strictly to ${subj}; never include content from another subject.` : "";
  onProgress({ done: 0, total: count, message: "Planning the lesson outline…" });

  const outlineRaw = await askOnce(
    `Plan a classroom slide deck on "${topic}" for ${ctx}.${lock} Return ONLY JSON: {"title": string, "slides": [{"kind": one of ${JSON.stringify(KINDS)}, "title": string, "focus": string (one sentence on what this slide teaches)}]} with EXACTLY ${count} slides in teaching order: title, objectives, hook, then concept slides that build step by step, 2-4 worked examples, one diagram slide if a diagram helps, a class activity, 2-3 check-for-understanding slides, common mistakes, summary, homework.`,
    "json", level, subj, signal, extra,
  );
  const outline = extractJson<{ title?: string; slides?: RawSlide[] }>(outlineRaw);
  const planned = (outline?.slides ?? []).filter((s) => s && s.title).slice(0, count);
  if (planned.length < 4) throw new Error("The AI did not return a usable outline.");

  const slides: Slide[] = [];
  const batch = 4;
  for (let i = 0; i < planned.length; i += batch) {
    const part = planned.slice(i, i + batch);
    onProgress({ done: i, total: planned.length, message: `Writing slides ${i + 1}-${i + part.length} of ${planned.length}…` });
    let rows: RawSlide[] | null = null;
    for (let attempt = 0; attempt < 2 && !rows; attempt++) {
      try {
        const raw = await askOnce(
          `You are writing slides ${i + 1} to ${i + part.length} of a ${planned.length}-slide deck titled "${outline?.title ?? topic}" for ${ctx}.\nSlides to write (in order): ${JSON.stringify(part.map((p) => ({ kind: p.kind, title: p.title, focus: p.focus })))}\nReturn ONLY a JSON array with one object per slide, same order. Each object: {"kind": string, "title": string, "bullets": [3 to 5 complete teaching sentences of 10-25 words each, specific and accurate], "notes": "3-5 sentences of speaker notes telling the teacher what to say, ask and demonstrate", "diagram": one of ${JSON.stringify(DIAGRAMS)}, "example": {"problem": string, "steps": [4-7 short steps], "answer": string} ONLY when kind is "example", "question": {"prompt": string, "options": [4 strings] (optional), "answer": string} ONLY when kind is "check"}. Use Ghanaian contexts (cedis, markets, trotro, cocoa). Plain-text maths only, e.g. x^2 + 3x - 4 = 0. Work every example out carefully and make sure its final answer is correct and follows from its steps.${lock}`,
          "json", level, subj, signal, extra,
        );
        const parsed = extractJson<RawSlide[]>(raw);
        if (Array.isArray(parsed) && parsed.length > 0) rows = parsed;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
      }
    }
    part.forEach((p, k) => {
      const written = rows?.[k];
      slides.push(normaliseSlide({ ...p, ...(written ?? {}), kind: written?.kind ?? p.kind, title: written?.title ?? p.title }, (p.kind as SlideKind) || "concept"));
    });
  }
  onProgress({ done: planned.length, total: planned.length, message: "Done" });
  return { id: uid(), topic: outline?.title || topic, subject, level, slides, createdAt: Date.now(), source: "ai" };
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

/** Offline deck built from the NaCCA curriculum vault, so the feature always works. */
export function curriculumDeck(topic: string, subject: string, level: Level): Deck {
  const terms = words(`${topic} ${subject}`);
  let best: { score: number; s: (typeof SUBJECTS)[number]; c: (typeof SUBJECTS)[number]["chapters"][number] } | null = null;
  for (const s of SUBJECTS) {
    for (const c of s.chapters) {
      const hay = `${c.title} ${c.keyIdeas.join(" ")} ${s.name}`.toLowerCase();
      let score = terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0) + (s.level === level ? 0.5 : 0);
      if (subject && s.name.toLowerCase() === subject.toLowerCase()) score += 1;
      if (!best || score > best.score) best = { score, s, c };
    }
  }
  const mk = (r: RawSlide, k: SlideKind) => normaliseSlide(r, k);
  const slides: Slide[] = [];
  if (!best || best.score < 1) {
    slides.push(mk({ kind: "title", title: topic, bullets: [subject || "Lesson", `${level} · Rexmond's Educational Consult`] }, "title"));
    slides.push(mk({ kind: "objectives", title: "Learning objectives", bullets: ["State what the topic means in your own words.", "Work through examples step by step.", "Avoid the mistakes examiners see most often."], notes: "The AI service was unavailable and no matching chapter was found in the offline vault. Edit these slides or try generating again." }, "objectives"));
    return { id: uid(), topic, subject, level, slides, createdAt: Date.now(), source: "curriculum" };
  }
  const { s, c } = best;
  slides.push(mk({ kind: "title", title: c.title, bullets: [s.name, `${s.syllabusCode} · ${level}`], notes: `Welcome the class and state today's focus: ${c.title}.` }, "title"));
  slides.push(mk({ kind: "objectives", title: "Learning objectives", bullets: c.outcomes, notes: "Read each objective aloud and ask learners which one feels hardest." }, "objectives"));
  c.keyIdeas.forEach((k, i) => slides.push(mk({ kind: "concept", title: `Key idea ${i + 1}`, bullets: [k], notes: "Explain the idea in simple words, give a local example, then ask a learner to rephrase it." }, "concept")));
  slides.push(mk({ kind: "example", title: `Worked example: ${c.example.title}`, bullets: [], example: { problem: c.example.problem, steps: c.example.steps, answer: c.example.answer }, notes: "Work the steps on the board slowly. Pause after each step and ask: why this step?" }, "example"));
  slides.push(mk({ kind: "check", title: "Check your understanding", bullets: ["Try a similar question in pairs for three minutes."], question: { prompt: c.example.problem, answer: c.example.answer }, notes: "Choose two pairs to explain their method." }, "check"));
  slides.push(mk({ kind: "mistakes", title: "Chief Examiner pitfall", bullets: [c.pitfall], notes: "Ask learners to say how they would avoid this mistake in an exam." }, "mistakes"));
  slides.push(mk({ kind: "summary", title: "Summary", bullets: c.keyIdeas, notes: "Ask three learners to each give one takeaway." }, "summary"));
  slides.push(mk({ kind: "homework", title: "Homework", bullets: [`Revise ${c.title}.`, "Write one new worked example of your own and bring it to the next lesson."], notes: "Set a clear deadline." }, "homework"));
  return { id: uid(), topic: c.title, subject: s.name, level, slides, createdAt: Date.now(), source: "curriculum" };
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Opens a print-ready view (one slide per page) so the deck can be saved as PDF. */
export function printDeck(deck: Deck): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const body = deck.slides.map((s) => `
    <section>
      <p class="k">${esc(s.kind)}</p><h1>${esc(s.title)}</h1>
      ${s.bullets.length ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      ${s.example ? `<div class="box"><b>Problem:</b> ${esc(s.example.problem)}<ol>${s.example.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol><b>Answer:</b> ${esc(s.example.answer)}</div>` : ""}
      ${s.question ? `<div class="box"><b>Question:</b> ${esc(s.question.prompt)}${s.question.options ? `<ol type="A">${s.question.options.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>` : ""}<br/><i>Answer: ${esc(s.question.answer)}</i></div>` : ""}
      ${s.notes ? `<p class="n"><b>Teacher notes:</b> ${esc(s.notes)}</p>` : ""}
    </section>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(deck.topic)}</title><style>
    @page{size:A4 landscape;margin:14mm} body{font-family:system-ui,sans-serif;color:#0f172a}
    section{page-break-after:always;min-height:170mm} h1{font-size:30pt;margin:2mm 0 6mm;color:#92400e} .k{font:600 9pt monospace;text-transform:uppercase;color:#0e7490;margin:0}
    ul{font-size:17pt;line-height:1.5} .box{border:1px solid #cbd5e1;border-radius:6px;padding:4mm;font-size:14pt;margin:4mm 0} .n{font-size:10pt;color:#475569;border-top:1px dashed #94a3b8;padding-top:3mm}
  </style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
  return true;
}

/** Downloads the deck as a PowerPoint file (library is loaded only when needed). */
export async function exportPptx(deck: Deck): Promise<void> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.topic;
  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: "0F172A" };
    slide.addText(s.title, { x: 0.5, y: 0.3, w: 12.3, h: 0.9, fontSize: 32, bold: true, color: "FBBF24", fontFace: "Calibri" });
    const rows: { text: string; options: Record<string, unknown> }[] = s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true, color: "E2E8F0", fontSize: 20 } }));
    if (s.example) {
      rows.push({ text: `Problem: ${s.example.problem}`, options: { breakLine: true, color: "67E8F9", fontSize: 18, bold: true } });
      s.example.steps.forEach((x, i) => rows.push({ text: `${i + 1}. ${x}`, options: { breakLine: true, color: "E2E8F0", fontSize: 17 } }));
      rows.push({ text: `Answer: ${s.example.answer}`, options: { breakLine: true, color: "FBBF24", fontSize: 18, bold: true } });
    }
    if (s.question) {
      rows.push({ text: `Question: ${s.question.prompt}`, options: { breakLine: true, color: "67E8F9", fontSize: 18, bold: true } });
      (s.question.options ?? []).forEach((o, i) => rows.push({ text: `${"ABCDE"[i]}. ${o}`, options: { breakLine: true, color: "E2E8F0", fontSize: 17 } }));
    }
    if (rows.length) slide.addText(rows as never, { x: 0.6, y: 1.4, w: 12, h: 5, valign: "top", fontFace: "Calibri" });
    if (s.notes) slide.addNotes(s.notes);
  }
  await pptx.writeFile({ fileName: `${deck.topic.replace(/[^\w\- ]+/g, "").slice(0, 60) || "lesson"}.pptx` });
}
