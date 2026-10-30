import { lazy, Suspense, type ComponentType } from "react";
import { BookOpen, Bot, Calculator, Cloud, GraduationCap, LayoutDashboard, PlayCircle, Radio, Search, WifiOff, Zap } from "lucide-react";
import { useApp } from "./state/AppContext";
import { cx } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CommandPalette } from "./components/CommandPalette";
import { Onboarding } from "./components/Onboarding";
import { Toasts } from "./components/Toasts";
import type { View } from "./types";

const Tutor = lazy(() => import("./modules/Tutor"));
const Dashboard = lazy(() => import("./modules/Dashboard"));
const Vault = lazy(() => import("./modules/Vault"));
const Studio = lazy(() => import("./modules/Studio"));
const Pasco = lazy(() => import("./modules/Pasco"));
const Player = lazy(() => import("./modules/Player"));
const Classroom = lazy(() => import("./modules/Classroom"));
const DataSaver = lazy(() => import("./modules/DataSaver"));

const NAV: { id: View; label: string; short: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Command Center", short: "Home", icon: LayoutDashboard },
  { id: "tutor", label: "AI Tutor", short: "AI", icon: Bot },
  { id: "vault", label: "Textbook Vault", short: "Books", icon: BookOpen },
  { id: "studio", label: "Live Studio", short: "Studio", icon: Radio },
  { id: "pasco", label: "Pasco Lab", short: "Pasco", icon: Calculator },
  { id: "player", label: "Video Lessons", short: "Videos", icon: PlayCircle },
  { id: "classroom", label: "Classroom Vault", short: "Class", icon: Cloud },
  { id: "data", label: "Data Saver", short: "Data", icon: Zap },
];

const SCREENS: Record<View, ComponentType> = {
  dashboard: Dashboard, tutor: Tutor, vault: Vault, studio: Studio, pasco: Pasco, player: Player, classroom: Classroom, data: DataSaver,
};

export default function App() {
  const { view, setView, online, settings, setPaletteOpen } = useApp();
  const Screen = SCREENS[view];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-amber-400 focus:px-3 focus:py-2 focus:text-slate-950">
        Skip to content
      </a>

      <aside className="no-print glass sticky top-0 hidden h-screen flex-col gap-2 rounded-none border-y-0 border-l-0 p-5 lg:flex" aria-label="Primary">
        <Brand />
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              aria-current={view === n.id ? "page" : undefined}
              className={cx(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition",
                view === n.id ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40" : "text-slate-300 hover:bg-slate-800/70",
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
        <header className="no-print glass sticky top-0 z-40 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden">
          <Brand compact />
          <div className="flex items-center gap-2">
            <StatusChips online={online} dataSaver={settings.dataSaver} compact />
            <button onClick={() => setPaletteOpen(true)} aria-label="Open command palette" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-700 text-slate-300"><Search className="h-5 w-5" /></button>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1800px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12">
          <ErrorBoundary key={view} label={NAV.find((n) => n.id === view)?.label}>
            <Suspense fallback={<p className="mono p-6 text-sm text-slate-400" role="status">Loading module…</p>}>
              <Screen />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <nav className="no-print glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-8 rounded-none border-x-0 border-b-0 px-1 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Primary mobile">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            aria-current={view === n.id ? "page" : undefined}
            aria-label={n.label}
            className={cx(
              "flex min-h-14 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold",
              view === n.id ? "text-amber-300" : "text-slate-400",
            )}
          >
            <n.icon className="h-5 w-5" />
            {n.short}
          </button>
        ))}
      </nav>

      <CommandPalette />
      <Onboarding />
      <Toasts />
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
