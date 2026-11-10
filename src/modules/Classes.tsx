import { useState } from "react";
import { Copy, Megaphone, MessageCircle, Plus, School, Trash2, UserPlus, Users } from "lucide-react";
import { useApp } from "../state/AppContext";
import { useAuth } from "../state/AuthContext";
import { useClass } from "../state/ClassContext";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";
import type { Level } from "../types";

export default function Classes() {
  const { mode, leaveDemo } = useAuth();
  const { role, notify } = useApp();
  const c = useClass();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState<Level>("SHS");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (mode !== "cloud") {
    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Real classes" title="Classes" />
        <Glass className="space-y-4 p-6" as="section">
          <School className="h-8 w-8 text-brand-t" />
          <h2 className="text-xl font-bold text-ink">You are exploring the demo class</h2>
          <p className="max-w-xl text-sm text-ink-2">The demo uses a simulated class of 24 learners stored in your browser. Create a free account to run real classes: teachers get a join code to share, students join with it, and live lessons, recordings, assessments and grades are saved securely and sync across devices.</p>
          <Button variant="gold" onClick={leaveDemo}>Create a free account</Button>
        </Glass>
      </div>
    );
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Give the class a name."); return; }
    setBusy(true); setErr(null);
    const res = await c.createClass({ name, subject, level });
    setBusy(false);
    if (res) setErr(res); else { setName(""); setSubject(""); notify("Class created. Share the join code with your students.", "success"); }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) { setErr("Enter the class code your teacher gave you."); return; }
    setBusy(true); setErr(null);
    const res = await c.joinClass(code);
    setBusy(false);
    if (res) setErr(res.replace(/^.*?:\s*/, "")); else { setCode(""); notify("You joined the class.", "success"); }
  };

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); notify(`${what} copied`, "success"); } catch { notify("Copy is not available here", "warn"); }
  };

  const act = c.activeClass;
  const shareText = act ? `Join my class "${act.name}" on Rexmond's Educational Consult: ${window.location.origin} then use the class code ${act.joinCode}` : "";

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow={role === "teacher" ? "Teacher workspace" : "Student workspace"} title="My Classes">
        <Pill tone="cyan"><Users className="h-3.5 w-3.5" /> {c.classes.length} class{c.classes.length === 1 ? "" : "es"}</Pill>
      </SectionTitle>

      {c.error && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad-t">{c.error}</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <Glass className="space-y-4 p-5 xl:col-span-1" as="section">
          {role === "teacher" ? (
            <form onSubmit={(e) => void create(e)} className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Plus className="h-5 w-5 text-brand-t" /> Create a class</h2>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-mute">Class name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. SHS 2 Science A" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-mute" /></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-mute">Subject</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} placeholder="e.g. Core Mathematics" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-mute" /></label>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Level">
                {(["JHS", "SHS"] as const).map((l) => (
                  <button type="button" key={l} aria-pressed={level === l} onClick={() => setLevel(l)} className={cx("min-h-11 rounded-xl border text-sm font-bold", level === l ? "border-sky-b/70 bg-sky-b/10 text-ink" : "border-line text-ink-2")}>{l}</button>
                ))}
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create class"}</Button>
            </form>
          ) : (
            <form onSubmit={(e) => void join(e)} className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><UserPlus className="h-5 w-5 text-brand-t" /> Join a class</h2>
              <p className="text-sm text-ink-2">Ask your teacher for the 6-character class code.</p>
              <label className="block"><span className="sr-only">Class code</span>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="ABC123" autoCapitalize="characters" className="mono min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-center text-xl font-bold tracking-[0.3em] text-ink placeholder:text-mute" /></label>
              <Button type="submit" variant="gold" className="w-full" disabled={busy}>{busy ? "Joining…" : "Join class"}</Button>
            </form>
          )}
          {err && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad-t">{err}</p>}
        </Glass>

        <div className="space-y-4 xl:col-span-2">
          {c.loading && <p className="mono text-sm text-mute" role="status">Loading your classes…</p>}
          {!c.loading && c.classes.length === 0 && (
            <Glass className="grid place-items-center gap-2 p-10 text-center" as="section">
              <School className="h-10 w-10 text-brand-t" />
              <p className="text-lg font-bold text-ink">{role === "teacher" ? "Create your first class" : "You have not joined a class yet"}</p>
              <p className="max-w-sm text-sm text-mute">{role === "teacher" ? "Name it, then share the join code with your students." : "Enter the code from your teacher on the left."}</p>
            </Glass>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {c.classes.map((k) => (
              <button key={k.id} onClick={() => c.setActiveClassId(k.id)} aria-pressed={act?.id === k.id}
                className={cx("glass rounded-2xl p-4 text-left transition", act?.id === k.id ? "border-brand/60 ring-1 ring-brand/40" : "hover:border-line")}>
                <div className="flex items-start justify-between gap-2"><h3 className="font-bold text-ink">{k.name}</h3><Pill tone={act?.id === k.id ? "amber" : "slate"}>{act?.id === k.id ? "Active" : k.level}</Pill></div>
                <p className="mt-1 text-sm text-ink-2">{k.subject || "General"}</p>
                {role === "student" && k.teacherName && <p className="mt-1 text-xs text-mute">Teacher: {k.teacherName}</p>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {act && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Glass className="space-y-4 p-5" as="section">
            <h2 className="text-lg font-bold text-ink">{act.name}</h2>
            {role === "teacher" && (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-mute">Join code</p>
                  <p className="mono mt-1 text-4xl font-bold tracking-[0.25em] text-brand-t" aria-label={`Join code ${act.joinCode.split("").join(" ")}`}>{act.joinCode}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => void copy(act.joinCode, "Code")}><Copy className="h-4 w-4" /> Copy code</Button>
                  <a className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-on-brand hover:bg-good" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}><MessageCircle className="h-4 w-4" /> Share on WhatsApp</a>
                </div>
                <Button variant="danger" onClick={() => { if (window.confirm(`Delete "${act.name}" with all its assessments, recordings and grades? This cannot be undone.`)) void c.deleteClass(act.id); }}><Trash2 className="h-4 w-4" /> Delete class</Button>
              </>
            )}
          </Glass>

          <Glass className="space-y-3 p-5" as="section">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Users className="h-5 w-5 text-sky-t" /> {role === "teacher" ? `Learners (${c.roster.length})` : "Classmates"}</h2>
            {role === "teacher" ? (
              c.roster.length === 0 ? <p className="text-sm text-mute">No learners yet. Share the code above.</p> : (
                <ul className="scroll-thin max-h-72 divide-y divide-line overflow-y-auto text-sm">
                  {c.roster.map((s) => <li key={s.id} className="py-2 text-ink">{s.name}</li>)}
                </ul>
              )
            ) : <p className="text-sm text-mute">Your teacher sees the class list. Your results stay private to you and your teacher.</p>}
          </Glass>

          <Glass className="space-y-3 p-5" as="section">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Megaphone className="h-5 w-5 text-brand-t" /> Announcements</h2>
            {role === "teacher" && (
              <form onSubmit={(e) => { e.preventDefault(); void c.postAnnouncement(msg).then(() => setMsg("")); }} className="space-y-2">
                <label className="sr-only" htmlFor="ann">Announcement</label>
                <textarea id="ann" value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} maxLength={2000} placeholder="e.g. Live class tomorrow 4pm. Bring your calculators." className="w-full resize-none rounded-xl border border-line bg-surface p-3 text-sm text-ink placeholder:text-mute" />
                <Button type="submit" variant="teal" disabled={!msg.trim()}>Post</Button>
              </form>
            )}
            {c.announcements.length === 0 ? <p className="text-sm text-mute">Nothing posted yet.</p> : (
              <ul className="scroll-thin max-h-72 space-y-2 overflow-y-auto">
                {c.announcements.map((a) => (
                  <li key={a.id} className="rounded-xl border border-line p-3 text-sm text-ink"><p className="whitespace-pre-wrap">{a.body}</p><p className="mt-1 text-xs text-mute">{new Date(a.createdAt).toLocaleString()}</p></li>
                ))}
              </ul>
            )}
          </Glass>
        </div>
      )}
    </div>
  );
}
