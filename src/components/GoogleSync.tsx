import { useEffect, useState } from "react";
import { Megaphone, Send, Upload } from "lucide-react";
import { GOOGLE_CLIENT_ID, TEACH_SCOPES, createCourseAssignment, fetchTeachingCourses, postAnnouncementToCourse, signIn } from "../lib/google";
import { supabase } from "../lib/supabase";
import { usePersistentState } from "../lib/storage";
import { useApp } from "../state/AppContext";
import { useClass } from "../state/ClassContext";
import { Button, Glass, Pill } from "./ui";
import type { ClassroomCourse } from "../types";

/** Teacher tools: push announcements, assessments and recorded lessons into a real Google Classroom course. */
export function GoogleSync() {
  const { notify } = useApp();
  const { activeClass, published, cloud } = useClass();
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [link, setLink] = usePersistentState<{ map: Record<string, string> }>("rex.gclass.link.v1", { map: {} });
  const [text, setText] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [lessons, setLessons] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState("");
  const key = activeClass?.id ?? "demo";
  const courseId = link.map[key] ?? "";

  useEffect(() => {
    if (!cloud || !activeClass) { setLessons([]); return; }
    void supabase.from("lessons").select("id, title").eq("class_id", activeClass.id).order("created_at", { ascending: false }).limit(30).then(({ data }) => setLessons((data ?? []) as { id: string; title: string }[]));
  }, [cloud, activeClass]);

  const run = async (label: string, fn: (token: string) => Promise<void>, done: string) => {
    setBusy(label);
    try { await fn(await signIn(TEACH_SCOPES)); notify(done, "success"); }
    catch (e) { notify(e instanceof Error ? e.message : "Google Classroom action failed.", "warn"); }
    finally { setBusy(""); }
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <Glass className="space-y-2 p-5">
        <div className="flex items-center gap-2"><Megaphone size={18} className="text-brand-t" /><h3 className="font-bold text-ink">Publish to Google Classroom</h3><Pill tone="amber">Setup needed</Pill></div>
        <p className="text-sm text-ink-2">To post announcements and assignments straight into your Google Classroom, add a Google OAuth client ID as <code className="mono text-brand-t">VITE_GOOGLE_CLIENT_ID</code> in Vercel and redeploy. The README has the five-minute setup.</p>
      </Glass>
    );
  }

  const origin = window.location.origin;
  const pickable = published.filter((a) => a.status === "published");
  const connected = courses.length > 0;

  return (
    <Glass className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2"><Megaphone size={18} className="text-brand-t" /><h3 className="mr-auto font-bold text-ink">Publish to Google Classroom</h3>
        <Button onClick={() => void run("connect", async (t) => { const c = await fetchTeachingCourses(t); setCourses(c); if (!c.length) throw new Error("No courses found where you are a teacher."); if (!link.map[key]) setLink({ map: { ...link.map, [key]: c[0].id } }); }, "Connected to Google Classroom.")} disabled={!!busy}>{connected ? "Refresh courses" : "Connect Google account"}</Button></div>

      {connected && (
        <>
          <label className="block text-sm"><span className="mb-1 block text-ink-2">Google Classroom course for {activeClass?.name ?? "this class"}</span>
            <select value={courseId} onChange={(e) => setLink({ map: { ...link.map, [key]: e.target.value } })} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink md:w-96">
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ""}</option>)}
            </select></label>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2"><p className="text-sm font-semibold text-ink">Announcement</p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Write to your Google Classroom stream" className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink" />
              <Button variant="gold" disabled={!text.trim() || !courseId || !!busy} onClick={() => void run("ann", (t) => postAnnouncementToCourse(t, courseId, text.trim()), "Posted to Google Classroom.").then(() => setText(""))}><Send size={16} />Post</Button></div>

            <div className="space-y-2"><p className="text-sm font-semibold text-ink">Assessment as assignment</p>
              <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} aria-label="Assessment" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink"><option value="">Choose a published assessment</option>{pickable.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
              <Button variant="gold" disabled={!assessmentId || !courseId || !!busy} onClick={() => { const a = pickable.find((x) => x.id === assessmentId)!; void run("asg", (t) => createCourseAssignment(t, courseId, { title: a.title, description: `${a.questions.length} questions · ${a.durationMin} minutes. Open Rexmond's Educational Consult, go to Assessments and take this test. Your score and feedback appear there automatically.`, links: [{ url: origin, title: "Open Rexmond's Educational Consult" }] }), "Assignment created in Google Classroom."); }}><Upload size={16} />Create assignment</Button></div>

            <div className="space-y-2"><p className="text-sm font-semibold text-ink">Recorded lesson</p>
              <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} aria-label="Recorded lesson" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink"><option value="">Choose a recording</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
              <Button variant="gold" disabled={!lessonId || !courseId || !!busy} onClick={() => { const l = lessons.find((x) => x.id === lessonId)!; void run("les", (t) => postAnnouncementToCourse(t, courseId, `New recorded lesson: ${l.title}. Watch it any time in Rexmond's Educational Consult under Recorded Classes: ${origin}`), "Lesson shared to Google Classroom."); }}><Send size={16} />Share link</Button></div>
          </div>
        </>
      )}
    </Glass>
  );
}
