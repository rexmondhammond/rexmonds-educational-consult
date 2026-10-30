import { lazy, Suspense, useState, type ComponentType } from "react";
import { GraduationCap, MoreHorizontal, Search, WifiOff, X, Zap } from "lucide-react";
import { useApp } from "./state/AppContext";
import { cx } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CommandPalette } from "./components/CommandPalette";
import { Onboarding } from "./components/Onboarding";
import { Toasts } from "./components/Toasts";
import { homeFor, navFor } from "./nav";
import type { Role, View } from "./types";

const Tutor = lazy(() => import("./modules/Tutor"));
const Dashboard = lazy(() => import("./modules/Dashboard"));
const Vault = lazy(() => import("./modules/Vault"));
const Studio = lazy(() => import("./modules/Studio"));
const Pasco = lazy(() => import("./modules/Pasco"));
const Player = lazy(() => import("./modules/Player"));
const Classroom = lazy(() => import("./modules/Classroom"));
const DataSaver = lazy(() => import("./modules/DataSaver"));
const Assessments = lazy(() => import("./modules/student/Assessments"));
const Growth = lazy(() => import("./modules/student/Growth"));
const TeacherHome = lazy(() => import("./modules/teacher/TeacherHome"));
const AssessmentBuilder = lazy(() => import("./modules/teacher/AssessmentBuilder"));
const Gradebook = lazy(() => import("./modules/teacher/Gradebook"));

const SCREENS: Record<View, ComponentType> = {
  dashboard: Dashboard, tutor: Tutor, vault: Vault, studio: Studio, pasco: Pasco, player: Player, classroom: Classroom, data: DataSaver,
  assessments: Assessments, growth: Growth, "t-home": TeacherHome, "t-build": AssessmentBuilder, "t-grades": Gradebook,
};

export default function App() {
  const { view, setView, online, settings, setPaletteOpen, role, switchRole } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const nav = navFor(role);
  const current: View = nav.some((n) => n.id === view) ? view : homeFor(role);
  const Screen = SCREENS[current];
  const primary = nav.slice(0, 4);
  const rest = nav.slice(4);
  const restActive = rest.some((n) => n.id === current);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-amber-400 focus:px-3 focus:py-2 focus:text-slate-950">
        Skip to content
      </a>

      <aside className="no-print glass sticky top-0 hidden h-screen flex-col gap-2 rounded-none border-y-0 border-l-0 p-5 lg:flex" aria-label="Primary">
        <Brand />
        <RoleSwitch role={role} onChange={switchRole} className="mt-4" />
        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto scroll-thin">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              aria-current={current === n.id ? "page" : undefined}
              className={cx(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition",
                current === n.id ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40" : "text-slate-300 hover:bg-slate-800/70",
              )}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 px-3 text-sm text-slate-300 transition hover:border-amber-400/50"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" /> Quick search
          <kbd className="mono ml-auto rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">Ctrl K</kbd>
        </button>
        <StatusChips online={online} dataSaver={settings.dataSaver} />
      </aside>

      <div className="min-w-0">
        <header className="no-print glass sticky top-0 z-40 flex items-center justify-between gap-2 rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden">
          <Brand compact />
          <div className="flex items-center gap-2">
            <StatusChips online={online} dataSaver={settings.dataSaver} compact />
            <RoleSwitch role={role} onChange={switchRole} compact />
            <button onClick={() => setPaletteOpen(true)} aria-label="Open command palette" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-700 text-slate-300"><Search className="h-5 w-5" /></button>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1800px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12">
          <ErrorBoundary key={current} label={nav.find((n) => n.id === current)?.label}>
            <Suspense fallback={<p className="mono p-6 text-sm text-slate-400" role="status">Loading…</p>}>
              <Screen />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <nav className="no-print glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 rounded-none border-x-0 border-b-0 px-1 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Primary mobile">
        {primary.map((n) => (
          <button
            key={n.id}
            onClick={() => { setView(n.id); setMoreOpen(false); }}
            aria-current={current === n.id ? "page" : undefined}
            aria-label={n.label}
            className={cx("flex min-h-14 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold", current === n.id ? "text-amber-300" : "text-slate-400")}
          >
            <n.icon className="h-5 w-5" />
            {n.short}
          </button>
        ))}
        <button onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} aria-label="More modules" className={cx("flex min-h-14 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold", restActive || moreOpen ? "text-amber-300" : "text-slate-400")}>
          {moreOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="no-print fixed inset-0 z-30 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="glass rise absolute inset-x-3 bottom-20 rounded-2xl p-3" role="menu" aria-label="More modules" onClick={(e) => e.stopPropagation()}>
            <ul className="grid grid-cols-2 gap-2">
              {rest.map((n) => (
                <li key={n.id}>
                  <button role="menuitem" onClick={() => { setView(n.id); setMoreOpen(false); }} className={cx("flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold", current === n.id ? "border-amber-400/60 text-amber-200" : "border-slate-700 text-slate-200")}>
                    <n.icon className="h-5 w-5 shrink-0" /> {n.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <CommandPalette />
      <Onboarding />
      <Toasts />
    </div>
  );
}

function RoleSwitch({ role, onChange, compact = false, className }: { role: Role; onChange: (r: Role) => void; compact?: boolean; className?: string }) {
  const options: { id: Role; label: string }[] = [{ id: "student", label: "Student" }, { id: "teacher", label: "Teacher" }];
  return (
    <div role="group" aria-label="Switch between student and teacher view" className={cx("grid grid-cols-2 gap-1 rounded-xl border border-slate-700 bg-slate-950/60 p-1", compact && "hidden sm:grid", className)}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={role === o.id}
          className={cx("min-h-9 rounded-lg px-3 text-xs font-bold transition", role === o.id ? (o.id === "teacher" ? "bg-cyan-400 text-slate-950" : "bg-amber-400 text-slate-950") : "text-slate-300 hover:bg-slate-800")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-cyan-400 text-slate-950 shadow-[0_0_24px_-4px_rgba(251,191,36,0.8)]">
        <GraduationCap className="h-6 w-6" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-extrabold tracking-tight text-white">Rexmond's</p>
        {!compact && <p className="mono text-[11px] uppercase tracking-widest text-amber-400">Educational Consult</p>}
        {compact && <p className="mono text-[10px] uppercase tracking-widest text-amber-400">Consult</p>}
      </div>
    </div>
  );
}

function StatusChips({ online, dataSaver, compact = false }: { online: boolean; dataSaver: boolean; compact?: boolean }) {
  return (
    <div className={cx("flex gap-2", compact ? "flex-row" : "flex-col")}>
      {!online && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
          <WifiOff className="h-3.5 w-3.5" /> Offline
        </span>
      )}
      {dataSaver && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <Zap className="h-3.5 w-3.5" /> Data saver
        </span>
      )}
    </div>
  );
}
