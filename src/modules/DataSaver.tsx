import { useEffect, useState } from "react";
import { Headphones, Image as ImageIcon, Signal, WifiOff, Zap } from "lucide-react";
import { SUBJECTS } from "../data/curriculum";
import { PASCO } from "../data/pasco";
import { useApp } from "../state/AppContext";
import { formatBytes, totalBlobBytes } from "../lib/storage";
import { Glass, SectionTitle, cx } from "../components/ui";

interface NetInfo { effectiveType?: string; downlink?: number; saveData?: boolean }

function Toggle({ on, onChange, label, hint, icon }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string; icon: React.ReactNode }) {
  return (
    <button
      role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="flex min-h-14 w-full items-center gap-4 rounded-xl border border-slate-700 p-4 text-left hover:border-slate-500"
    >
      <span className="text-amber-300">{icon}</span>
      <span className="flex-1"><span className="block text-sm font-bold text-white">{label}</span><span className="block text-xs text-slate-400">{hint}</span></span>
      <span className={cx("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-emerald-400" : "bg-slate-700")} aria-hidden>
        <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all", on ? "left-[1.4rem]" : "left-0.5")} />
      </span>
    </button>
  );
}

export default function DataSaver() {
  const { settings, updateSettings, online } = useApp();
  const [stored, setStored] = useState(0);
  const [net, setNet] = useState<NetInfo>({});

  useEffect(() => { void totalBlobBytes().then(setStored); }, []);
  useEffect(() => {
    const c = (navigator as Navigator & { connection?: NetInfo }).connection;
    if (c) setNet({ effectiveType: c.effectiveType, downlink: c.downlink, saveData: c.saveData });
  }, []);

  const estimate = (settings.dataSaver ? 0.35 : 1) * (settings.audioOnly ? 0.12 : 1);

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Built for MTN, Telecel and AirtelTigo" title="Data Saver & Offline Mode" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Glass className="space-y-3 p-5" as="section">
          <h2 className="text-lg font-bold text-white">Bandwidth controls</h2>
          <Toggle on={settings.dataSaver} onChange={(v) => updateSettings({ dataSaver: v })} label="Low-bandwidth mode" hint="Removes blur effects, animations and confetti; lowers recording bitrate." icon={<Zap className="h-5 w-5" />} />
          <Toggle on={settings.audioOnly} onChange={(v) => updateSettings({ audioOnly: v })} label="Audio-only lectures" hint="Board lessons are read aloud instead of drawn; recorded video hides its picture." icon={<Headphones className="h-5 w-5" />} />
          <Toggle on={settings.compressImages} onChange={(v) => updateSettings({ compressImages: v })} label="Compress images" hint="Prefer text and vector diagrams over raster images." icon={<ImageIcon className="h-5 w-5" />} />
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Network</legend>
            <div className="flex gap-2">
              {(["MTN", "Telecel", "AirtelTigo"] as const).map((c) => (
                <button key={c} onClick={() => updateSettings({ carrier: c })} aria-pressed={settings.carrier === c}
                  className={cx("min-h-11 flex-1 rounded-xl border text-sm font-bold", settings.carrier === c ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-slate-700 text-slate-300")}>{c}</button>
              ))}
            </div>
          </fieldset>
        </Glass>

        <Glass className="space-y-4 p-5" as="section">
          <h2 className="text-lg font-bold text-white">Connection</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 p-3"><p className="flex items-center gap-2 text-xs text-slate-400">{online ? <Signal className="h-4 w-4 text-emerald-400" /> : <WifiOff className="h-4 w-4 text-red-400" />} Status</p><p className="mono text-lg font-bold text-white">{online ? "Online" : "Offline"}</p></div>
            <div className="rounded-xl border border-slate-800 p-3"><p className="text-xs text-slate-400">Detected network</p><p className="mono text-lg font-bold text-white">{net.effectiveType ? net.effectiveType.toUpperCase() : "Unknown"}</p></div>
            <div className="rounded-xl border border-slate-800 p-3"><p className="text-xs text-slate-400">Downlink</p><p className="mono text-lg font-bold text-white">{net.downlink ? `${net.downlink} Mbps` : "n/a"}</p></div>
            <div className="rounded-xl border border-slate-800 p-3"><p className="text-xs text-slate-400">Est. data per lesson hour</p><p className="mono text-lg font-bold text-amber-300">~{Math.round(450 * estimate)} MB</p></div>
          </div>
          {(net.saveData || net.effectiveType === "2g" || net.effectiveType === "slow-2g") && !settings.dataSaver && (
            <button onClick={() => updateSettings({ dataSaver: true })} className="min-h-11 w-full rounded-xl bg-amber-400 text-sm font-bold text-slate-950">Your connection looks slow: turn on Low-bandwidth mode</button>
          )}
          <p className="text-xs text-slate-500">Estimates are indicative and vary with network conditions.</p>
        </Glass>
      </div>

      <Glass className="space-y-3 p-5" as="section">
        <h2 className="text-lg font-bold text-white">Offline library</h2>
        <p className="text-sm text-slate-300">
          {settings.cachedTextbooks.length} of {SUBJECTS.length} textbooks and {settings.cachedPasco.length} of 2 Pasco sets are marked for offline use ·{" "}
          <span className="mono text-amber-300">{formatBytes(stored)}</span> of recordings and Classroom files stored on this device.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-xs font-bold uppercase text-slate-400">Textbooks</h3>
            <ul className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => {
                const on = settings.cachedTextbooks.includes(s.id);
                return (
                  <li key={s.id}>
                    <button onClick={() => updateSettings({ cachedTextbooks: on ? settings.cachedTextbooks.filter((x) => x !== s.id) : [...settings.cachedTextbooks, s.id] })} aria-pressed={on}
                      className={cx("min-h-11 rounded-full border px-3 text-xs font-semibold", on ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-slate-700 text-slate-400")}>{s.name}</button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-bold uppercase text-slate-400">Past questions</h3>
            <ul className="flex flex-wrap gap-2">
              {(["BECE", "WASSCE"] as const).map((e) => {
                const on = settings.cachedPasco.includes(e);
                return (
                  <li key={e}>
                    <button onClick={() => updateSettings({ cachedPasco: on ? settings.cachedPasco.filter((x) => x !== e) : [...settings.cachedPasco, e] })} aria-pressed={on}
                      className={cx("min-h-11 rounded-full border px-3 text-xs font-semibold", on ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-slate-700 text-slate-400")}>{e} ({PASCO.filter((q) => q.exam === e).length} items)</button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p className="text-xs text-slate-500">All lesson data, textbooks and past questions are bundled with the app, so they already work offline once the page has loaded. Add a service worker to cache the app shell for cold offline starts.</p>
      </Glass>
    </div>
  );
}
