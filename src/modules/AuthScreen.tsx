import { useState } from "react";
import { GraduationCap, Presentation, ShieldCheck, Video } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { Button, Glass, cx } from "../components/ui";
import type { Level, Role } from "../types";

export default function AuthScreen() {
  const { signIn, signUp, enterDemo } = useAuth();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [role, setRole] = useState<Role>("student");
  const [level, setLevel] = useState<Level>("SHS");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) { setError("Use a password of at least 8 characters."); return; }
    if (tab === "up" && !name.trim()) { setError("Please enter your name."); return; }
    setBusy(true);
    try {
      if (tab === "in") {
        const err = await signIn(email, password);
        if (err) setError(err.toLowerCase().includes("email not confirmed") ? "Please confirm your email first (check your inbox), then sign in." : err);
      } else {
        const res = await signUp({ email, password, name, role, level });
        if (res.error) setError(res.error);
        else if (res.needsConfirm) setInfo("Account created. Check your email for a confirmation link, then sign in.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="kente fixed inset-x-0 top-0 z-40" aria-hidden />
      <section className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex" aria-hidden>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-on-brand"><GraduationCap className="h-7 w-7" /></div>
          <div><p className="font-extrabold text-ink">Rexmond's</p><p className="text-xs font-semibold text-brand-t">Educational Consult</p></div>
        </div>
        <div className="space-y-6">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-ink">Teach live. <span className="text-brand-t">Learn any time.</span></h1>
          <p className="max-w-md text-lg text-ink-2">Real classes for Ghana's JHS and SHS: live lessons with AI slides and screen sharing, recordings students can replay, assessments with instant marking, and Google Classroom sync.</p>
          <ul className="space-y-3 text-ink">
            {[[Video, "Live classes and replayable recordings"], [Presentation, "AI-written slide decks for every topic"], [ShieldCheck, "Private classes joined with a code"]].map(([Icon, text]) => {
              const I = Icon as typeof Video;
              return <li key={text as string} className="flex items-center gap-3"><I className="h-5 w-5 text-sky-t" /> {text as string}</li>;
            })}
          </ul>
        </div>
        <p className="text-xs text-mute">Built for MTN, Telecel and AirtelTigo connections with a low-data mode.</p>
      </section>

      <section className="grid place-items-center p-4 sm:p-8">
        <Glass className="rise w-full max-w-md space-y-5 p-6 sm:p-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-on-brand"><GraduationCap className="h-6 w-6" /></div>
            <p className="font-extrabold text-ink">Rexmond's Educational Consult</p>
          </div>
          <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-canvas/60 p-1">
            {([["in", "Sign in"], ["up", "Create account"]] as const).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(null); setInfo(null); }}
                className={cx("min-h-10 rounded-lg text-sm font-bold transition", tab === id ? "bg-brand text-on-brand" : "text-ink-2 hover:bg-sunken")}>{label}</button>
            ))}
          </div>

          <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
            {tab === "up" && (
              <>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-ink">I am a…</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {([["student", "Student"], ["teacher", "Teacher"]] as const).map(([id, label]) => (
                      <button type="button" key={id} aria-pressed={role === id} onClick={() => setRole(id)}
                        className={cx("min-h-12 rounded-xl border font-bold transition", role === id ? "border-brand/70 bg-brand/10 text-ink" : "border-line text-ink-2 hover:border-line-strong")}>{label}</button>
                    ))}
                  </div>
                </fieldset>
                <label className="block"><span className="mb-1 block text-sm font-semibold text-ink">Full name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink" /></label>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-ink">{role === "teacher" ? "Level you teach" : "Your level"}</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(["JHS", "SHS"] as const).map((l) => (
                      <button type="button" key={l} aria-pressed={level === l} onClick={() => setLevel(l)}
                        className={cx("min-h-11 rounded-xl border text-sm font-bold", level === l ? "border-sky-b/70 bg-sky-b/10 text-ink" : "border-line text-ink-2")}>{l === "JHS" ? "JHS 1-3 (BECE)" : "SHS 1-3 (WASSCE)"}</button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            <label className="block"><span className="mb-1 block text-sm font-semibold text-ink">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink" /></label>
            <label className="block"><span className="mb-1 block text-sm font-semibold text-ink">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === "in" ? "current-password" : "new-password"} required minLength={8} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink" /></label>
            {error && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad-t">{error}</p>}
            {info && <p role="status" className="rounded-xl border border-good/40 bg-good/10 p-3 text-sm text-good-t">{info}</p>}
            <Button type="submit" variant="gold" className="w-full" disabled={busy}>{busy ? "Please wait…" : tab === "in" ? "Sign in" : "Create account"}</Button>
          </form>

          <div className="border-t border-line pt-4 text-center">
            <p className="mb-2 text-xs text-mute">Just looking around? No account needed.</p>
            <Button variant="ghost" className="w-full" onClick={enterDemo}>Explore the demo class</Button>
          </div>
        </Glass>
      </section>
    </div>
  );
}
