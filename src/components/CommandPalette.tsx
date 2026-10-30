import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { BookOpen, Bot, Calculator, Cloud, LayoutDashboard, PlayCircle, Radio, Search, Zap } from "lucide-react";
import { SUBJECTS } from "../data/curriculum";
import { useApp } from "../state/AppContext";
import { cx } from "./ui";
import type { View } from "../types";

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
}

const VIEWS: { id: View; label: string; hint: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Command Center", hint: "Progress, goals and flashcards", icon: LayoutDashboard },
  { id: "tutor", label: "AI Tutor", hint: "Explain, quiz, mark, plan", icon: Bot },
  { id: "vault", label: "Textbook Vault", hint: "NaCCA-aligned study manuals", icon: BookOpen },
  { id: "pasco", label: "Pasco Lab", hint: "Past questions, aggregate, report card", icon: Calculator },
  { id: "studio", label: "Live Studio", hint: "Chalkboard, record and broadcast", icon: Radio },
  { id: "player", label: "Video Lessons", hint: "Interactive checkpoints", icon: PlayCircle },
  { id: "classroom", label: "Classroom Vault", hint: "Zero-Drive Google Classroom", icon: Cloud },
  { id: "data", label: "Data Saver", hint: "Low-bandwidth and offline mode", icon: Zap },
];

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setView, askTutor, settings, updateSettings, notify } = useApp();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [paletteOpen]);

  const commands = useMemo<Command[]>(() => {
    const close = () => setPaletteOpen(false);
    const q = query.trim().toLowerCase();
    const list: Command[] = [];
    if (q.length > 2) {
      list.push({ id: "ask", label: `Ask AI: ${query.trim()}`, hint: "Get a step-by-step explanation", icon: Bot, run: () => { close(); askTutor({ prompt: query.trim() }); } });
    }
    for (const v of VIEWS) list.push({ id: v.id, label: v.label, hint: v.hint, icon: v.icon, run: () => { close(); setView(v.id); } });
    list.push({
      id: "toggle-data",
      label: settings.dataSaver ? "Turn Data Saver off" : "Turn Data Saver on",
      hint: "Fewer animations, smaller recordings",
      icon: Zap,
      run: () => { close(); updateSettings({ dataSaver: !settings.dataSaver }); notify(settings.dataSaver ? "Data Saver off" : "Data Saver on", "success"); },
    });
    for (const s of SUBJECTS) {
      list.push({ id: `s-${s.id}`, label: `${s.name} (${s.level})`, hint: `Open ${s.syllabusCode} in the Textbook Vault`, icon: BookOpen, run: () => { close(); setView("vault"); } });
    }
    if (!q) return list.filter((c) => !c.id.startsWith("s-")).slice(0, 10);
    return list.filter((c) => c.id === "ask" || `${c.label} ${c.hint}`.toLowerCase().includes(q)).slice(0, 9);
  }, [query, askTutor, notify, setPaletteOpen, setView, settings.dataSaver, updateSettings]);

  if (!paletteOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[70] flex items-start justify-center bg-black/70 p-4 pt-[12vh]"
      role="dialog" aria-modal="true" aria-label="Command palette"
      onClick={(e) => { if (e.target === e.currentTarget) setPaletteOpen(false); }}
      onKeyDown={(e) => { if (e.key === "Escape") setPaletteOpen(false); }}
    >
      <div className="glass rise w-full max-w-xl overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-slate-800 px-4">
          <Search className="h-5 w-5 text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(commands.length - 1, a + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              if (e.key === "Enter") { e.preventDefault(); commands[active]?.run(); }
            }}
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
            aria-label="Search commands, subjects, or ask a question"
            placeholder="Jump to a module, find a subject, or ask a question…"
            className="min-h-14 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="mono hidden rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">ESC</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="scroll-thin max-h-[50vh] overflow-y-auto p-2">
          {commands.length === 0 && <li className="p-4 text-sm text-slate-400">No matches. Type a question of 3+ letters to ask the AI tutor.</li>}
          {commands.map((c, i) => (
            <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={c.run}
                className={cx("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left", i === active ? "bg-amber-400/15 text-amber-200" : "text-slate-200")}
              >
                <c.icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.label}</span><span className="block truncate text-xs text-slate-400">{c.hint}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
