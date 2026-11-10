import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Film, Search, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { LessonPart } from "../lib/lessonRecorder";
import { useAuth } from "../state/AuthContext";
import { useApp } from "../state/AppContext";
import { useClass } from "../state/ClassContext";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";

interface Lesson { id: string; title: string; subject: string; topic: string; duration_sec: number; parts: LessonPart[]; created_at: string; session_id: string | null }

const fmt = (s: number) => { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.max(1, m)} min`; };
const posKey = (id: string) => `rex.resume.${id}`;
const readPos = (id: string): { part: number; time: number } => { try { return JSON.parse(localStorage.getItem(posKey(id)) || "") as { part: number; time: number }; } catch { return { part: 0, time: 0 }; } };

export default function Library() {
  const { mode, profile } = useAuth();
  const { activeClass, cloud } = useClass();
  const { setView, notify } = useApp();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const classId = activeClass?.id ?? "";
  const teacher = profile?.role === "teacher";

  const load = useCallback(async () => {
    if (!classId) { setLessons([]); return; }
    setLoading(true);
    const { data } = await supabase.from("lessons").select("id, title, subject, topic, duration_sec, parts, created_at, session_id").eq("class_id", classId).order("created_at", { ascending: false });
    setLessons((data ?? []) as Lesson[]);
    setLoading(false);
  }, [classId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!classId) return;
    const ch = supabase.channel(`lib-${classId}`).on("postgres_changes", { event: "*", schema: "public", table: "lessons", filter: `class_id=eq.${classId}` }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [classId, load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? lessons.filter((l) => `${l.title} ${l.subject} ${l.topic}`.toLowerCase().includes(t)) : lessons;
  }, [lessons, q]);
  const open = lessons.find((l) => l.id === openId) ?? null;

  const remove = async (l: Lesson) => {
    if (!window.confirm(`Delete "${l.title}" and its video?`)) return;
    await supabase.storage.from("lessons").remove(l.parts.map((p) => p.path));
    const { error } = await supabase.from("lessons").delete().eq("id", l.id);
    if (error) notify(`Could not delete: ${error.message}`, "warn"); else { setOpenId(null); await load(); }
  };

  if (mode !== "cloud" || !cloud) {
    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Replay" title="Recorded classes" />
        <Glass className="space-y-3 p-5">
          <p className="text-ink">Recorded live classes are saved to your class so every learner can replay them at any time. Sign in to use them.</p>
          <p className="text-sm text-mute">In the demo you can still record and replay lessons on this device from Live Studio and Video Lessons.</p>
          <Button onClick={() => setView("player")}>Open Video Lessons</Button>
        </Glass>
      </div>
    );
  }
  if (!activeClass) {
    return (<div className="space-y-6"><SectionTitle eyebrow="Replay" title="Recorded classes" /><Glass className="space-y-3 p-5"><p className="text-ink">{teacher ? "Create a class to start recording lessons." : "Join a class to see its recorded lessons."}</p><Button variant="gold" onClick={() => setView("classes")}>Go to My Classes</Button></Glass></div>);
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Replay" title="Recorded classes">Every lesson recorded in {activeClass.name}. Watch any time; playback remembers where you stopped.</SectionTitle>
      <label className="relative block max-w-md">
        <span className="sr-only">Search recordings</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, subject or topic" className="min-h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-ink" />
      </label>

      {open && <Player key={open.id} lesson={open} canDelete={teacher} onDelete={() => void remove(open)} />}

      {loading && lessons.length === 0 ? <p className="text-sm text-mute" role="status">Loading recordings…</p>
        : shown.length === 0 ? (
          <Glass className="p-5 text-sm text-ink-2">{lessons.length === 0 ? (teacher ? "No recordings yet. Press Record while you teach in Live Class and the video is saved here automatically." : "No recordings yet. When your teacher records a lesson it will appear here.") : "Nothing matches your search."}</Glass>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((l) => {
              const pos = readPos(l.id);
              return (
                <li key={l.id}><button onClick={() => { setOpenId(l.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={cx("glass w-full rounded-2xl p-4 text-left transition hover:border-brand/60", l.id === openId && "border-brand")}>
                  <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-b/15 text-sky-t"><Film size={18} /></span>
                    <div className="min-w-0"><p className="truncate font-semibold text-ink">{l.title}</p>
                      <p className="mono mt-0.5 text-xs text-mute">{new Date(l.created_at).toLocaleDateString()} · <Clock size={11} className="inline" /> {fmt(l.duration_sec)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">{l.subject && <Pill tone="cyan">{l.subject}</Pill>}{(pos.part > 0 || pos.time > 5) && <Pill tone="amber">Resume</Pill>}</div></div></div>
                </button></li>
              );
            })}
          </ul>
        )}
    </div>
  );
}

function Player({ lesson, canDelete, onDelete }: { lesson: Lesson; canDelete: boolean; onDelete: () => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [part, setPart] = useState(() => Math.min(readPos(lesson.id).part, Math.max(0, lesson.parts.length - 1)));
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const resumeAt = useRef(readPos(lesson.id).time);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase.storage.from("lessons").createSignedUrls(lesson.parts.map((p) => p.path), 60 * 60 * 6);
      if (!alive) return;
      if (err || !data) { setError("Could not load the video. Check your connection and try again."); return; }
      const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
      const list = lesson.parts.map((p) => byPath.get(p.path) ?? "");
      if (list.some((u) => !u)) setError("Part of this recording is missing.");
      setUrls(list);
    })();
    return () => { alive = false; };
  }, [lesson]);

  const save = () => { const v = video.current; if (v) try { localStorage.setItem(posKey(lesson.id), JSON.stringify({ part, time: v.currentTime })); } catch { /* storage unavailable */ } };
  const total = lesson.parts.length;

  return (
    <Glass className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2"><h3 className="mr-auto min-w-0 truncate text-lg font-bold text-brand-t">{lesson.title}</h3>{total > 1 && <Pill tone="slate">Part {part + 1} of {total}</Pill>}{canDelete && <Button onClick={onDelete} aria-label="Delete recording"><Trash2 size={16} />Delete</Button>}</div>
      {error ? <p className="text-bad-t" role="alert">{error}</p> : urls[part] ? (
        <video
          ref={video} key={urls[part]} src={urls[part]} controls autoPlay playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black"
          onLoadedMetadata={(e) => { if (resumeAt.current > 5) { e.currentTarget.currentTime = resumeAt.current; } resumeAt.current = 0; }}
          onTimeUpdate={() => { if (Math.round((video.current?.currentTime ?? 0)) % 5 === 0) save(); }}
          onPause={save}
          onEnded={() => { if (part < total - 1) setPart(part + 1); else try { localStorage.removeItem(posKey(lesson.id)); } catch { /* ignore */ } }}
        />
      ) : <div className="grid aspect-video place-items-center rounded-xl bg-surface text-sm text-mute" role="status">Loading video…</div>}
      {total > 1 && <div className="flex flex-wrap gap-1.5">{lesson.parts.map((_, i) => <button key={i} onClick={() => setPart(i)} className={cx("min-h-9 rounded-full border px-3 text-xs", i === part ? "border-brand text-brand-t" : "border-line text-ink-2")}>Part {i + 1}</button>)}</div>}
    </Glass>
  );
}
