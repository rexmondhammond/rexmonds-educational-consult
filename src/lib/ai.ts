export type TutorMode = "explain" | "quiz" | "mark" | "plan";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AiFailure = "not_configured" | "rate_limited" | "offline" | "unavailable";

export class AiError extends Error {
  readonly kind: AiFailure;
  constructor(kind: AiFailure) {
    super(kind);
    this.kind = kind;
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
  if (res.status === 429) throw new AiError("rate_limited");
  if (!res.ok || !res.body) throw new AiError("unavailable");
  // A static host answering with the HTML app shell means no serverless function is deployed.
  if (!(res.headers.get("content-type") ?? "").startsWith("text/plain")) throw new AiError("not_configured");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) opts.onToken(text);
  }
}

export const FAILURE_COPY: Record<AiFailure, string> = {
  not_configured: "The AI tutor is not connected yet. The site owner needs to add an ANTHROPIC_API_KEY on the host. Meanwhile, here is what the offline curriculum vault found.",
  rate_limited: "You are asking very fast. Take a breath and try again in a minute.",
  offline: "You appear to be offline. Here is what the offline curriculum vault found.",
  unavailable: "The AI tutor could not answer just now. Please try again. Here is what the offline curriculum vault found.",
};
