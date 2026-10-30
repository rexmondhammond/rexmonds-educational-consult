import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { useApp } from "../state/AppContext";
import { Button, Glass, cx } from "./ui";
import type { Level } from "../types";

export function Onboarding() {
  const { settings, updateSettings, notify } = useApp();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<Level>("SHS");
  if (settings.onboarded) return null;

  const finish = (skip: boolean) => {
    const clean = name.trim().slice(0, 30);
    updateSettings({ onboarded: true, level, name: skip ? undefined : clean || undefined });
    notify(clean && !skip ? `Akwaaba, ${clean}! Press Ctrl+K anytime to jump anywhere.` : "Welcome! Press Ctrl+K anytime to jump anywhere.", "success");
  };

  return (
    <div className="no-print fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <Glass className="rise w-full max-w-md space-y-6 p-6 sm:p-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-cyan-400 text-slate-950 shadow-[0_0_30px_-4px_rgba(251,191,36,0.7)]"><GraduationCap className="h-8 w-8" /></div>
          <h2 id="onb-title" className="text-2xl font-extrabold text-white">Akwaaba to Rexmond's</h2>
          <p className="text-sm text-slate-400">Two quick questions so we can tailor your study space.</p>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">What should we call you?</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoFocus placeholder="Your first name" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500" />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-200">Which level are you preparing for?</legend>
          <div className="grid grid-cols-2 gap-3">
            {([["JHS", "JHS 1-3", "BECE track"], ["SHS", "SHS 1-3", "WASSCE track"]] as const).map(([id, label, sub]) => (
              <button key={id} type="button" aria-pressed={level === id} onClick={() => setLevel(id)}
                className={cx("min-h-16 rounded-xl border p-3 text-left transition", level === id ? "border-amber-400/70 bg-amber-400/10" : "border-slate-700 hover:border-slate-500")}>
                <span className="block font-bold text-white">{label}</span><span className="text-xs text-slate-400">{sub}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="gold" className="flex-1" onClick={() => finish(false)}>Start learning</Button>
          <Button variant="ghost" onClick={() => finish(true)}>Skip for now</Button>
        </div>
      </Glass>
    </div>
  );
}
