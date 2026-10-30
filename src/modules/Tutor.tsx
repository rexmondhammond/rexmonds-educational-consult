import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Brain, CalendarCheck, ClipboardCheck, Copy, Send, Sparkles, Square, Trash2, WifiOff } from "lucide-react";
import { SUBJECTS } from "../data/curriculum";
import { AiError, FAILURE_COPY, streamTutor, type ChatTurn, type TutorMode } from "../lib/ai";
import { offlineAnswer } from "../lib/offlineAnswer";
import { usePersistentState } from "../lib/storage";
import { useApp } from "../state/AppContext";
import { Markdown } from "../components/Markdown";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";
import type { Level } from "../types";

const MODES: { id: TutorMode; label: string; hint: string; icon: typeof Brain; placeholder: string }[] = [
  { id: "explain", label: "Explain", hint: "Step-by-step teaching", icon: Brain, placeholder: "Ask anything, e.g. How do I solve quadratic equations by factorisation?" },
  { id: "quiz", label: "Quiz me", hint: "One exam-style question at a time", icon: Sparkles, placeholder: "Pick a topic, e.g. Photosynthesis" },
  { id: "mark", label: "Mark my answer", hint: "WAEC examiner M/A/B marking", icon: ClipboardCheck, placeholder: "Paste the question and your answer to be marked" },
  { id: "plan", label: "Study plan", hint: "A realistic revision timetable", icon: CalendarCheck, placeholder: "e.g. I write BECE in 6 weeks. Weak in Maths and English." },
];

const SUGGESTIONS: Record<TutorMode, string[]> = {
  explain: ["Explain percentage change with a cedi example", "What is the difference between mitosis and meiosis?", "How do I find the nth term of a sequence?"],
  quiz: ["Quiz me on fractions and decimals", "Quiz me on Newton's laws", "Quiz me on the 1992 Constitution of Ghana"],
  mark: ["Question: Solve x^2 - 5x + 6 = 0. My answer: x = 2 or x = 3 because (x-2)(x-3)=0", "Define demand. My answer: Demand is when people want a thing."],
  plan: ["Build me a 4-week WASSCE revision plan for Core Maths and Physics", "I have 1 hour a day. Plan my BECE revision for 5 weeks"],
};

interface TutorState {
  turns: ChatTurn[];
  mode: TutorMode;
  subject: string;
}

const EMPTY: TutorState = { turns: [], mode: "explain", subject: "" };
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function Tutor() {
  const { settings, tutorSeed, clearTutorSeed, notify, online } = useApp();
  const [state, setState] = usePersistentState<TutorState>("rex.tutor.v1", EMPTY);
  const level: Level = settings.level ?? "SHS";
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLTextAreaElement | null>(null);

  const subjects = useMemo(() => SUBJECTS.filter((s) => s.level === level), [level]);
  const mode = MODES.find((m) => m.id === state.mode) ?? MODES[0];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: settings.dataSaver ? "auto" : "smooth", block: "end" });
  }, [state.turns, settings.dataSaver]);

  const send = useCallback(
    async (text: string, override?: { mode?: TutorMode; subject?: string }) => {
      const clean = text.trim();
      if (!clean || busy) return;
      const useMode = override?.mode ?? state.mode;
      const useSubject = override?.subject ?? state.subject;
      const userTurn: ChatTurn = { id: uid(), role: "user", content: clean.slice(0, 4000) };
      const replyId = uid();
      const history = [...state.turns, userTurn];
      setState((s) => ({ ...s, mode: useMode, subject: useSubject, turns: [...history, { id: replyId, role: "assistant", content: "" }] }));
      setInput("");
      setNotice(null);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      let received = false;
      try {
        await streamTutor({
          messages: history,
          mode: useMode,
          level,
          subject: useSubject,
          concise: settings.dataSaver,
          signal: controller.signal,
          onToken: (t) => {
            received = true;
            setState((s) => ({ ...s, turns: s.turns.map((x) => (x.id === replyId ? { ...x, content: x.content + t } : x)) }));
          },
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          /* user pressed stop: keep what streamed so far */
        } else {
          const kind = err instanceof AiError ? err.kind : "unavailable";
          setNotice(FAILURE_COPY[kind]);
          if (!received) {
            const fallback = kind === "rate_limited" ? "" : offlineAnswer(clean, level);
            setState((s) => ({ ...s, turns: s.turns.map((x) => (x.id === replyId ? { ...x, content: fallback || "Please try again shortly." } : x)) }));
          }
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, level, setState, settings.dataSaver, state.mode, state.subject, state.turns],
  );

  // Handle questions sent from other screens ("Ask AI" buttons, command palette).
  useEffect(() => {
    if (!tutorSeed) return;
    const seed = tutorSeed;
    clearTutorSeed();
    void send(seed.prompt, { mode: seed.mode ?? "explain", subject: seed.subject ?? state.subject });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorSeed]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Answer copied", "success");
    } catch {
      notify("Copy is not available in this browser", "warn");
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Powered by AI · Ghana curriculum aware" title="Rexmond AI Tutor">
        {!online && <Pill tone="red"><WifiOff className="h-3.5 w-3.5" /> Offline vault mode</Pill>}
        <Pill tone="cyan">{level} · {state.subject || "All subjects"}</Pill>
      </SectionTitle>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <Glass className="hidden h-fit space-y-5 p-4 lg:block" as="aside">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Mode</legend>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setState((s) => ({ ...s, mode: m.id }))}
                  aria-pressed={state.mode === m.id}
                  className={cx(
                    "flex min-h-11 items-center gap-3 rounded-xl border p-3 text-left transition",
                    state.mode === m.id ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-slate-700 text-slate-300 hover:border-slate-500",
                  )}
                >
                  <m.icon className="h-5 w-5 shrink-0" />
                  <span><span className="block text-sm font-bold">{m.label}</span><span className="hidden text-xs text-slate-400 lg:block">{m.hint}</span></span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Subject focus</span>
            <select
              value={state.subject}
              onChange={(e) => setState((s) => ({ ...s, subject: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
            >
              <option value="">All subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </label>

          <Button variant="ghost" className="w-full" disabled={state.turns.length === 0 || busy} onClick={() => { setState((s) => ({ ...s, turns: [] })); setNotice(null); }}>
            <Trash2 className="h-4 w-4" /> Clear conversation
          </Button>
          <p className="text-xs leading-relaxed text-slate-400">AI can make mistakes. Check important facts against your textbook or teacher. When you are offline, answers come from the built-in curriculum vault.</p>
        </Glass>

        <Glass className="flex min-h-[22rem] h-[calc(100dvh-21rem)] flex-col overflow-hidden lg:h-[calc(100vh-11rem)]" as="section">
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 p-2 lg:hidden" role="group" aria-label="Tutor settings">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setState((s) => ({ ...s, mode: m.id }))} aria-pressed={state.mode === m.id}
                className={cx("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold", state.mode === m.id ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-slate-700 text-slate-300")}>
                <m.icon className="h-4 w-4" /> {m.label}
              </button>
            ))}
            <label className="sr-only" htmlFor="tutor-subject-m">Subject focus</label>
            <select id="tutor-subject-m" value={state.subject} onChange={(e) => setState((s) => ({ ...s, subject: e.target.value }))} className="min-h-11 shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100">
              <option value="">All subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <button onClick={() => { setState((s) => ({ ...s, turns: [] })); setNotice(null); }} disabled={state.turns.length === 0 || busy} aria-label="Clear conversation" className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-slate-700 text-slate-300 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" role="log" aria-live="polite" aria-label="Conversation">
            {state.turns.length === 0 && (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-md space-y-4">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-cyan-400 text-slate-950 shadow-[0_0_30px_-4px_rgba(251,191,36,0.7)]"><Bot className="h-7 w-7" /></div>
                  <h2 className="text-xl font-extrabold text-white">{mode.label}: {mode.hint}</h2>
                  <p className="text-sm text-slate-400">Try one of these to start:</p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS[state.mode].map((s) => (
                      <button key={s} onClick={() => void send(s)} className="min-h-11 rounded-xl border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-cyan-400/60 hover:bg-cyan-400/5">{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {state.turns.map((t, i) => {
              const streaming = busy && i === state.turns.length - 1 && t.role === "assistant";
              return (
                <div key={t.id} className={cx("flex gap-3", t.role === "user" && "flex-row-reverse")}>
                  <div className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold", t.role === "user" ? "bg-slate-700 text-white" : "bg-gradient-to-br from-amber-400 to-cyan-400 text-slate-950")} aria-hidden>
                    {t.role === "user" ? "You" : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={cx("group max-w-[85%] rounded-2xl border px-4 py-3", t.role === "user" ? "border-cyan-400/30 bg-cyan-400/10" : "border-slate-700/80 bg-slate-950/50")}>
                    {t.role === "user" ? <p className="whitespace-pre-wrap text-sm text-slate-100">{t.content}</p> : t.content ? <Markdown text={t.content} /> : <span className="mono text-xs text-slate-400" role="status">Thinking…</span>}
                    {streaming && t.content && <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-amber-300 align-middle" aria-hidden />}
                    {t.role === "assistant" && t.content && !streaming && (
                      <button onClick={() => void copy(t.content)} className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs text-slate-400 hover:text-amber-300" aria-label="Copy answer"><Copy className="h-3.5 w-3.5" /> Copy</button>
                    )}
                  </div>
                </div>
              );
            })}
            {notice && <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100" role="status">{notice}</p>}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-end gap-2 border-t border-slate-800 p-3 sm:p-4"
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
          >
            <label className="sr-only" htmlFor="tutor-input">Message to Rexmond AI</label>
            <textarea
              id="tutor-input"
              ref={boxRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              rows={2}
              maxLength={4000}
              placeholder={mode.placeholder}
              className="min-h-14 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            {busy ? (
              <Button type="button" variant="danger" onClick={() => abortRef.current?.abort()} aria-label="Stop generating"><Square className="h-4 w-4" /> Stop</Button>
            ) : (
              <Button type="submit" variant="gold" disabled={!input.trim()} aria-label="Send message"><Send className="h-4 w-4" /> Send</Button>
            )}
          </form>
        </Glass>
      </div>
    </div>
  );
}
