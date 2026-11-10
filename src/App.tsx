import { lazy, Suspense, useState, type ComponentType } from "react";
import { GraduationCap, LogOut, MoreHorizontal, Search, WifiOff, X, Zap } from "lucide-react";
import { useApp } from "./state/AppContext";
import { useAuth } from "./state/AuthContext";
import AuthScreen from "./modules/AuthScreen";
import { cx } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CommandPalette } from "./components/CommandPalette";
import { Onboarding } from "./components/Onboarding";
import { Toasts } from "./components/Toasts";
import { ThemeToggle } from "./components/ThemeToggle";
import { useClass } from "./state/ClassContext";
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
const Classes = lazy(() => import("./modules/Classes"));
const Slides = lazy(() => import("./modules/Slides"));
const Live = lazy(() => import("./modules/Live"));
const Library = lazy(() => import("./modules/Library"));

const SCREENS: Record<View, ComponentType> = {
  dashboard: Dashboard, tutor: Tutor, vault: Vault, studio: Studio, pasco: Pasco, player: Player, classroom: Classroom, data: DataSaver,
  assessments: Assessments, growth: Growth, "t-home": TeacherHome, "t-build": AssessmentBuilder, "t-grades": Gradebook,
  classes: Classes, slides: Slides, live: Live, library: Library,
};

export default function App() {
  const { mode } = useAuth();
  if (mode === "loading") return <p className="mono grid min-h-screen place-items-center text-sm text-mute" role="status">Loading…</p>;
  if (mode === "signed-out") return <AuthScreen />;
  return <Shell />;
}

function Shell() {
  const { mode, profile, signOut, leaveDemo } = useAuth();
  const cloud = mode === "cloud";
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
      <div className="kente no-print fixed inset-x-0 top-0 z-40" aria-hidden />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-on-brand">
        Skip to content
      </a>

      <aside className="no-print glass sticky top-0 hidden h-screen flex-col gap-2 rounded-none border-y-0 border-l-0 p-5 lg:flex" aria-label="Primary">
        <Brand />
        {cloud ? (
          <div className="mt-4 rounded-xl border border-line bg-canvas/60 p-3">
            <p className="truncate text-sm font-bold text-ink">{profile?.name}</p>
            <p className="mono text-[11px] uppercase tracking-widest text-sky-t">{role} · {profile?.level}</p>
          </div>
        ) : (
          <RoleSwitch role={role} onChange={switchRole} className="mt-4" />
        )}
        <ClassPicker />
        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto scroll-thin">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              aria-current={current === n.id ? "page" : undefined}
              className={cx(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition",
                current === n.id ? "bg-brand text-on-brand shadow-sm" : "text-ink-2 hover:bg-sunken",
              )}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 text-sm text-ink-2 transition hover:border-brand/50"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" /> Quick search
          <kbd className="mono ml-auto rounded border border-line px-1.5 py-0.5 text-[10px] text-mute">Ctrl K</kbd>
        </button>
        <ThemeToggle />
        <button onClick={() => { if (cloud) void signOut(); else leaveDemo(); }} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-mute hover:bg-sunken hover:text-ink">
          <LogOut className="h-4 w-4" /> {cloud ? "Sign out" : "Exit demo"}
        </button>
        <StatusChips online={online} dataSaver={settings.dataSaver} />
      </aside>

      <div className="min-w-0">
        <header className="no-print glass sticky top-0 z-40 flex items-center justify-between gap-2 rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden">
          <Brand compact />
          <div className="flex items-center gap-2">
            <StatusChips online={online} dataSaver={settings.dataSaver} compact />
            {!cloud && <RoleSwitch role={role} onChange={switchRole} compact />}
            <button onClick={() => setPaletteOpen(true)} aria-label="Open command palette" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-line text-ink-2"><Search className="h-5 w-5" /></button>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1800px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12">
          <ErrorBoundary key={current} label={nav.find((n) => n.id === current)?.label}>
            <Suspense fallback={<p className="mono p-6 text-sm text-mute" role="status">Loading…</p>}>
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
            className={cx("flex min-h-14 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold", current === n.id ? "text-brand-t" : "text-mute")}
          >
            <n.icon className="h-5 w-5" />
            {n.short}
          </button>
        ))}
        <button onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} aria-label="More modules" className={cx("flex min-h-14 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold", restActive || moreOpen ? "text-brand-t" : "text-mute")}>
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
                  <button role="menuitem" onClick={() => { setView(n.id); setMoreOpen(false); }} className={cx("flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold", current === n.id ? "border-brand/60 text-brand-t" : "border-line text-ink")}>
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

function ClassPicker() {
  const { classes, activeClass, setActiveClassId, cloud } = useClass();
  if (!cloud || classes.length === 0) return null;
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-mute">Active class</span>
      <select value={activeClass?.id ?? ""} onChange={(e) => setActiveClassId(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink">
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}

function RoleSwitch({ role, onChange, compact = false, className }: { role: Role; onChange: (r: Role) => void; compact?: boolean; className?: string }) {
  const options: { id: Role; label: string }[] = [{ id: "student", label: "Student" }, { id: "teacher", label: "Teacher" }];
  return (
    <div role="group" aria-label="Switch between student and teacher view" className={cx("grid grid-cols-2 gap-1 rounded-xl border border-line bg-canvas/60 p-1", compact && "hidden sm:grid", className)}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={role === o.id}
          className={cx("min-h-9 rounded-lg px-3 text-xs font-bold transition", role === o.id ? (o.id === "teacher" ? "bg-sky-b text-on-brand" : "bg-brand text-on-brand") : "text-ink-2 hover:bg-sunken")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-on-brand ">
        <GraduationCap className="h-6 w-6" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-extrabold tracking-tight text-ink">Rexmond's</p>
        <p className="text-xs font-semibold text-brand-t">{compact ? "Consult" : "Educational Consult"}</p>
      </div>
    </div>
  );
}

function StatusChips({ online, dataSaver, compact = false }: { online: boolean; dataSaver: boolean; compact?: boolean }) {
  return (
    <div className={cx("flex gap-2", compact ? "flex-row" : "flex-col")}>
      {!online && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-bad/40 bg-bad/10 px-3 py-1 text-xs font-semibold text-bad-t">
          <WifiOff className="h-3.5 w-3.5" /> Offline
        </span>
      )}
      {dataSaver && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-good/40 bg-good/10 px-3 py-1 text-xs font-semibold text-good-t">
          <Zap className="h-3.5 w-3.5" /> Data saver
        </span>
      )}
    </div>
  );
}
