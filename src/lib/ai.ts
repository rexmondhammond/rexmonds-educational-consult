export type TutorMode = "explain" | "quiz" | "mark" | "plan" | "lesson" | "questions" | "feedback" | "json";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AiFailure = "not_configured" | "rate_limited" | "offline" | "unavailable";

export class AiError extends Error {
  readonly kind: AiFailure;
  readonly detail: string;
  constructor(kind: AiFailure, detail = "") {
    super(kind);
    this.kind = kind;
    this.detail = detail;
  }
}

export interface StreamOptions {
  messages: ChatTurn[];
  mode: TutorMode;
  level: "JHS" | "SHS";
  subject: string;
  concise: boolean;
  signal: AbortSignal;
  onToken: (text: string) => void;
}

/** Streams a tutor reply from the serverless function. Throws AiError on failure. */
export async function streamTutor(opts: StreamOptions): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new AiError("offline");

  let res: Response;
  try {
    res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: opts.signal,
      body: JSON.stringify({
        messages: opts.messages.map(({ role, content }) => ({ role, content })),
        mode: opts.mode,
        level: opts.level,
        subject: opts.subject,
        concise: opts.concise,
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new AiError("offline");
  }

  if (res.status === 503 || res.status === 404 || res.status === 405) throw new AiError("not_configured");
  if (!res.ok || !res.body) {
    let detail = "";
    try {
      const info = (await res.json()) as { detail?: string; status?: number };
      detail = [info.status ? `HTTP ${info.status}` : "", info.detail ?? ""].filter(Boolean).join(": ");
    } catch {
      /* no JSON body */
    }
    throw new AiError(res.status === 429 ? "rate_limited" : "unavailable", detail);
  }
  // A static host answering with the HTML app shell means no serverless function is deployed.
  if (!(res.headers.get("content-type") ?? "").startsWith("text/plain")) throw new AiError("not_configured");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) {
      total += text.length;
      opts.onToken(text);
    }
  }
  if (total === 0) throw new AiError("unavailable", "The AI service returned an empty answer");
}

/** Runs one non-interactive AI request and returns the complete text. */
export async function askOnce(prompt: string, mode: TutorMode, level: "JHS" | "SHS", subject = "", signal?: AbortSignal): Promise<string> {
  let out = "";
  await streamTutor({
    messages: [{ id: "q", role: "user", content: prompt }],
    mode,
    level,
    subject,
    concise: false,
    signal: signal ?? new AbortController().signal,
    onToken: (t) => { out += t; },
  });
  return out;
}

export const FAILURE_COPY: Record<AiFailure, string> = {
  not_configured: "The AI tutor is not connected yet. The site owner needs to add an AI key (GEMINI_API_KEY is free) on the host. Meanwhile, here is what the offline curriculum vault found.",
  rate_limited: "You are asking very fast. Take a breath and try again in a minute.",
  offline: "You appear to be offline. Here is what the offline curriculum vault found.",
  unavailable: "The AI tutor could not answer just now. Here is what the offline curriculum vault found.",
};

/** Pulls the first JSON array/object out of an AI reply (tolerates code fences and stray prose). */
export function extractJson<T>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const starts = [cleaned.indexOf("["), cleaned.indexOf("{")].filter((n) => n >= 0);
  if (starts.length === 0) return null;
  const start = Math.min(...starts);
  const open = cleaned[start];
  const end = cleaned.lastIndexOf(open === "[" ? "]" : "}");
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
