import { useCallback, useEffect, useRef, useState } from "react";
import type { Room as LkRoom } from "livekit-client";
import { Calendar, Circle, Hand, Loader2, Mic, MicOff, MonitorUp, Play, Presentation, Radio, Send, Square, Users, Video, VideoOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/AuthContext";
import { useApp } from "../state/AppContext";
import { useClass } from "../state/ClassContext";
import { useDecks } from "../lib/decks";
import type { Deck, Slide } from "../lib/deck";
import { SegmentedRecorder, mixAudio } from "../lib/lessonRecorder";
import { Presenter } from "../components/Presenter";
import { SlideView } from "../components/SlideView";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";

interface Session { id: string; title: string; room: string; status: "scheduled" | "live" | "ended"; deck_id: string | null; scheduled_for: string | null; created_by: string; created_at: string }
interface Chat { id: number; from: string; text: string; mine: boolean }
interface SlideMsg { slide: Slide; index: number; total: number }

const enc = new TextEncoder();
const dec = new TextDecoder();

export default function Live() {
  const { mode, session: auth, profile } = useAuth();
  const { activeClass, cloud } = useClass();
  const { notify, setView } = useApp();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [deckId, setDeckId] = useState("");
  const { decks } = useDecks();
  const teacher = profile?.role === "teacher";
  const classId = activeClass?.id ?? "";

  const load = useCallback(async () => {
    if (!classId) { setSessions([]); return; }
    const { data } = await supabase.from("live_sessions").select("id, title, room, status, deck_id, scheduled_for, created_by, created_at").eq("class_id", classId).order("created_at", { ascending: false }).limit(30);
    setSessions((data ?? []) as Session[]);
  }, [classId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!classId) return;
    const ch = supabase.channel(`live-${classId}`).on("postgres_changes", { event: "*", schema: "public", table: "live_sessions", filter: `class_id=eq.${classId}` }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [classId, load]);

  if (mode !== "cloud" || !cloud) {
    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Live" title="Live class" />
        <Glass className="space-y-3 p-5">
          <p className="text-ink">Live classes need a real class with real learners, so they are available once you sign in.</p>
          <p className="text-sm text-mute">You are in the demo class. Create an account to schedule live lessons, share your screen, present AI slides and save recordings for students.</p>
          <Button variant="gold" onClick={() => setView("classes")}>See how classes work</Button>
        </Glass>
      </div>
    );
  }
  if (!activeClass) {
    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Live" title="Live class" />
        <Glass className="space-y-3 p-5"><p className="text-ink">{teacher ? "Create a class first, then schedule your first live lesson." : "Join a class with your teacher's code to see its live lessons."}</p><Button variant="gold" onClick={() => setView("classes")}>Go to My Classes</Button></Glass>
      </div>
    );
  }

  const openSession = sessions.find((s) => s.id === openId);
  if (openSession) {
    return <LiveRoom key={openSession.id} session={openSession} teacher={openSession.created_by === auth?.user.id} decks={decks} onLeave={() => { setOpenId(null); void load(); }} />;
  }

  const create = async (startNow: boolean) => {
    const t = title.trim() || `${activeClass.subject || activeClass.name} lesson`;
    const { data, error } = await supabase.from("live_sessions").insert({
      class_id: classId, title: t, deck_id: deckId || null, created_by: auth!.user.id,
      scheduled_for: when ? new Date(when).toISOString() : null, status: startNow ? "live" : "scheduled", started_at: startNow ? new Date().toISOString() : null,
    }).select("id").single();
    if (error) { notify(`Could not create the session: ${error.message}`, "warn"); return; }
    setTitle(""); setWhen("");
    await load();
    if (startNow && data) setOpenId(data.id);
    else notify("Lesson scheduled. Students can see it now.", "success");
  };

  const live = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) => s.status === "ended");

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Live" title="Live class">Real-time video, screen sharing and synced slides for {activeClass.name}. Every lesson can be recorded for students to replay.</SectionTitle>

      {teacher && (
        <Glass className="space-y-3 p-4 sm:p-5">
          <h3 className="font-bold text-ink">New lesson</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm"><span className="mb-1 block text-ink-2">Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${activeClass.subject || "Lesson"}: topic`} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink" /></label>
            <label className="text-sm"><span className="mb-1 block text-ink-2">Slides (optional)</span>
              <select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink">
                <option value="">None, choose later</option>{decks.map((d) => <option key={d.id} value={d.id}>{d.topic}</option>)}
              </select></label>
            <label className="text-sm"><span className="mb-1 block text-ink-2">Date and time (to schedule)</span><input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink" /></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={() => void create(true)}><Radio size={16} />Go live now</Button>
            <Button onClick={() => void create(false)} disabled={!when}><Calendar size={16} />Schedule</Button>
          </div>
          {decks.length === 0 && <p className="text-xs text-mute">No slides yet. Create a deck in AI Slides and attach it here.</p>}
        </Glass>
      )}

      {live.length > 0 && <SessionList heading="Live now" items={live} teacher={teacher} onOpen={setOpenId} tone="red" />}
      {upcoming.length > 0 && <SessionList heading="Upcoming" items={upcoming} teacher={teacher} onOpen={setOpenId} tone="amber" />}
      {past.length > 0 && <SessionList heading="Past lessons" items={past.slice(0, 8)} teacher={teacher} onOpen={() => setView("library")} tone="slate" past />}
      {sessions.length === 0 && <Glass className="p-5 text-sm text-ink-2">{teacher ? "No lessons yet. Go live or schedule one above." : "No live lessons yet. Your teacher's lessons will appear here."}</Glass>}
    </div>
  );
}

function SessionList({ heading, items, teacher, onOpen, tone, past }: { heading: string; items: Session[]; teacher: boolean; onOpen: (id: string) => void; tone: "red" | "amber" | "slate"; past?: boolean }) {
  return (
    <section aria-label={heading}>
      <h3 className="mb-2 text-base font-bold text-ink">{heading}</h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((s) => (
          <li key={s.id}><Glass className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{s.title}</p>
              <p className="mono text-xs text-mute">{s.scheduled_for ? new Date(s.scheduled_for).toLocaleString() : new Date(s.created_at).toLocaleDateString()}</p></div>
            <Pill tone={tone}>{s.status}</Pill>
            <Button variant={past ? "ghost" : "gold"} onClick={() => onOpen(s.id)}>{past ? "Recordings" : s.status === "live" || teacher ? <><Play size={16} />{teacher && s.status !== "live" ? "Start" : "Join"}</> : "Not started"}</Button>
          </Glass></li>
        ))}
      </ul>
    </section>
  );
}

function VideoTile({ lk, source, identity, className }: { lk: LkRoom | null; source: "screen" | "camera"; identity: "teacher" | "me"; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [, bump] = useState(0);
  useEffect(() => {
    if (!lk) return;
    const h = () => bump((n) => n + 1);
    const events = ["trackSubscribed", "trackUnsubscribed", "localTrackPublished", "localTrackUnpublished", "participantConnected", "participantDisconnected"] as const;
    const emitter = lk as unknown as { on: (e: string, f: () => void) => void; off: (e: string, f: () => void) => void };
    events.forEach((e) => emitter.on(e, h));
    return () => { events.forEach((e) => emitter.off(e, h)); };
  }, [lk]);
  let track: { attach: (el: HTMLVideoElement) => void; detach: (el: HTMLVideoElement) => void } | undefined;
  if (lk) {
    const src = source === "screen" ? "screen_share" : "camera";
    const parts = identity === "me" ? [lk.localParticipant] : [...lk.remoteParticipants.values()].filter((p) => { try { return JSON.parse(p.metadata || "{}").role === "teacher"; } catch { return false; } });
    for (const p of parts) { const pub = p.getTrackPublication(src as never); if (pub?.track && !pub.isMuted) { track = pub.track as never; break; } }
  }
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => { track?.detach(el); };
  });
  if (!track) return null;
  return <video ref={ref} autoPlay playsInline muted={identity === "me"} className={cx("w-full rounded-xl border border-line bg-black object-contain", className)} aria-label={source === "screen" ? "Shared screen" : "Teacher camera"} />;
}

function LiveRoom({ session, teacher, decks, onLeave }: { session: Session; teacher: boolean; decks: Deck[]; onLeave: () => void }) {
  const { session: auth } = useAuth();
  const { activeClass } = useClass();
  const { notify } = useApp();
  const [lk, setLk] = useState<LkRoom | null>(null);
  const [state, setState] = useState<"connecting" | "live" | "off" | "error">("connecting");
  const [errText, setErrText] = useState("");
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [people, setPeople] = useState(1);
  const [chat, setChat] = useState<Chat[]>([]);
  const [draft, setDraft] = useState("");
  const [hands, setHands] = useState<Record<string, string>>({});
  const [handUp, setHandUp] = useState(false);
  const [incoming, setIncoming] = useState<SlideMsg | null>(null);
  const [deck, setDeck] = useState<Deck | null>(() => decks.find((d) => d.id === session.deck_id) ?? null);
  const [idx, setIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [recState, setRecState] = useState<{ on: boolean; parts: number; failed: number; seconds: number }>({ on: false, parts: 0, failed: 0, seconds: 0 });
  const recRef = useRef<{ rec: SegmentedRecorder; close: () => void; streams: MediaStream[]; started: number } | null>(null);
  const lkRef = useRef<LkRoom | null>(null);
  const deckRef = useRef<{ deck: Deck | null; idx: number }>({ deck, idx });
  deckRef.current = { deck, idx };
  const chatId = useRef(0);
  const classId = activeClass?.id ?? "";

  const send = useCallback((topic: string, payload: unknown, to?: string[]) => {
    const room = lkRef.current;
    if (!room) return;
    void room.localParticipant.publishData(enc.encode(JSON.stringify(payload)), { reliable: true, topic, destinationIdentities: to });
  }, []);

  const broadcastSlide = useCallback((to?: string[]) => {
    const { deck: d, idx: i } = deckRef.current;
    if (!d) return;
    send("slide", { slide: d.slides[Math.min(i, d.slides.length - 1)], index: i, total: d.slides.length } satisfies SlideMsg, to);
  }, [send]);

  useEffect(() => {
    let closed = false;
    let room: LkRoom | null = null;
    (async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch("/api/live", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ sessionId: session.id }) });
        if (res.status === 503 || res.status === 404) { setState("off"); return; }
        if (!res.ok) { const b = (await res.json().catch(() => ({}))) as { error?: string }; throw new Error(b.error === "ended" ? "This lesson has ended." : b.error === "forbidden" ? "You are not a member of this class." : `The live service returned ${res.status}.`); }
        const { token: jwt, url } = (await res.json()) as { token: string; url: string };
        const lkm = await import("livekit-client");
        room = new lkm.Room({ adaptiveStream: true, dynacast: true });
        lkRef.current = room;
        const count = () => setPeople(room!.remoteParticipants.size + 1);
        room.on(lkm.RoomEvent.ParticipantConnected, (p) => { count(); if (teacher) broadcastSlide([p.identity]); });
        room.on(lkm.RoomEvent.ParticipantDisconnected, (p) => { count(); setHands((h) => { const n = { ...h }; delete n[p.identity]; return n; }); });
        room.on(lkm.RoomEvent.Disconnected, () => { if (!closed) { setState("error"); setErrText("You were disconnected from the class."); } });
        room.on(lkm.RoomEvent.DataReceived, (payload, p, _k, topic) => {
          let msg: Record<string, unknown>;
          try { msg = JSON.parse(dec.decode(payload)) as Record<string, unknown>; } catch { return; }
          if (topic === "chat" && typeof msg.text === "string") setChat((c) => [...c.slice(-199), { id: ++chatId.current, from: p?.name || "Someone", text: msg.text as string, mine: false }]);
          else if (topic === "slide" && !teacher) setIncoming(msg as unknown as SlideMsg);
          else if (topic === "hand" && teacher && p) setHands((h) => { const n = { ...h }; if (msg.up) n[p.identity] = p.name || "Learner"; else delete n[p.identity]; return n; });
        });
        await room.connect(url, jwt);
        if (closed) { await room.disconnect(); return; }
        setLk(room); count(); setState("live");
        if (!teacher && auth) void supabase.from("attendance").upsert({ session_id: session.id, student_id: auth.user.id }, { onConflict: "session_id,student_id", ignoreDuplicates: true });
      } catch (e) {
        if (!closed) { setState("error"); setErrText(e instanceof Error ? e.message : "Could not join the class."); }
      }
    })();
    return () => { closed = true; void room?.disconnect(); lkRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // keep students on the teacher's current slide
  useEffect(() => { if (teacher && state === "live") broadcastSlide(); }, [idx, deck, teacher, state, broadcastSlide]);
  useEffect(() => { if (!recState.on) return; const t = setInterval(() => setRecState((r) => ({ ...r, seconds: Math.round((Date.now() - (recRef.current?.started ?? Date.now())) / 1000) })), 1000); return () => clearInterval(t); }, [recState.on]);

  const toggle = async (what: "mic" | "cam" | "screen") => {
    const p = lk?.localParticipant;
    if (!p) return;
    try {
      if (what === "mic") { await p.setMicrophoneEnabled(!mic); setMic(!mic); }
      if (what === "cam") { await p.setCameraEnabled(!cam); setCam(!cam); }
      if (what === "screen") { await p.setScreenShareEnabled(!sharing, { audio: true }); setSharing(!sharing); }
    } catch (e) {
      notify(e instanceof Error && /denied|permission|NotAllowed/i.test(e.message) ? "Permission was denied. Allow it in your browser and try again." : "Could not change that. Check your device and try again.", "warn");
    }
  };

  const sendChat = () => {
    const text = draft.trim();
    if (!text) return;
    send("chat", { text });
    setChat((c) => [...c.slice(-199), { id: ++chatId.current, from: "You", text, mine: true }]);
    setDraft("");
  };
  const raise = () => { send("hand", { up: !handUp }); setHandUp(!handUp); };

  const startRecording = async () => {
    if (!SegmentedRecorder.supported()) { notify("This browser cannot record. Use Chrome or Edge on a computer.", "warn"); return; }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: true });
      let micStream: MediaStream | null = null;
      try { micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { /* record without mic */ }
      const mixed = mixAudio(micStream ? [display, micStream] : [display]);
      const stream = new MediaStream([...display.getVideoTracks(), ...(mixed.track ? [mixed.track] : [])]);
      const rec = new SegmentedRecorder(stream, `${classId}/${session.id}`, ({ parts, failed }) => setRecState((r) => ({ ...r, parts, failed })));
      rec.start();
      recRef.current = { rec, close: mixed.close, streams: [display, ...(micStream ? [micStream] : [])], started: Date.now() };
      display.getVideoTracks()[0]?.addEventListener("ended", () => void stopRecording());
      setRecState({ on: true, parts: 0, failed: 0, seconds: 0 });
      notify("Recording started. Choose the tab or window students should see, and tick Share audio.", "success");
    } catch (e) {
      notify(e instanceof DOMException && e.name === "NotAllowedError" ? "Recording was cancelled." : "Could not start recording.", "warn");
    }
  };

  const stopRecording = useCallback(async (): Promise<boolean> => {
    const r = recRef.current;
    if (!r) return true;
    recRef.current = null;
    setRecState((s) => ({ ...s, on: false }));
    const parts = await r.rec.finish();
    r.close(); r.streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    if (!parts.length) { notify("Nothing was recorded.", "warn"); return false; }
    const seconds = parts.reduce((n, p) => n + p.seconds, 0);
    const { error } = await supabase.from("lessons").insert({
      class_id: classId, session_id: session.id, deck_id: deck && decks.some((d) => d.id === deck.id) ? deck.id : null,
      title: session.title, subject: activeClass?.subject ?? "", topic: deck?.topic ?? "", duration_sec: seconds, parts, created_by: auth!.user.id,
    });
    if (error) { notify(`Recording uploaded but could not be listed: ${error.message}`, "warn"); return false; }
    notify(`Recording saved (${Math.max(1, Math.round(seconds / 60))} min). Students can watch it in Recorded Classes.`, "success");
    return true;
  }, [auth, classId, deck, decks, notify, session.id, session.title, activeClass?.subject]);

  const end = async () => {
    if (!window.confirm("End this class for everyone?")) return;
    await stopRecording();
    await supabase.from("live_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
    onLeave();
  };
  const goLive = async () => { await supabase.from("live_sessions").update({ status: "live", started_at: new Date().toISOString() }).eq("id", session.id); };
  useEffect(() => { if (teacher && session.status === "scheduled") void goLive(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const hasScreen = Boolean(lk && ((sharing && teacher) || [...lk.remoteParticipants.values()].some((p) => p.getTrackPublication("screen_share" as never)?.track)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto min-w-0 truncate text-xl font-bold text-ink">{session.title}</h2>
        {state === "live" && <Pill tone="red">LIVE</Pill>}
        <Pill tone="slate"><Users size={12} className="mr-1 inline" />{people}</Pill>
        {recState.on && <Pill tone="red"><Circle size={10} className="mr-1 inline animate-pulse fill-current" />REC {Math.floor(recState.seconds / 60)}:{String(recState.seconds % 60).padStart(2, "0")}</Pill>}
        <Button onClick={onLeave}>{teacher ? "Back" : "Leave"}</Button>
      </div>

      {state === "connecting" && <Glass className="flex items-center gap-2 p-4 text-ink" role="status"><Loader2 className="animate-spin" size={18} />Connecting to the classroom…</Glass>}
      {state === "error" && <Glass className="space-y-2 p-4" role="alert"><p className="text-bad-t">{errText}</p><Button onClick={onLeave}>Back to lessons</Button></Glass>}
      {state === "off" && (
        <Glass className="space-y-2 p-4" role="status">
          <p className="font-semibold text-brand-t">Live video is not set up on this site yet.</p>
          <p className="text-sm text-ink-2">{teacher ? "Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET in Vercel (free LiveKit Cloud account) and redeploy. Until then you can still present slides and record your lesson below; students can watch the recording." : "Your teacher has not enabled live video yet. Watch the recorded classes instead."}</p>
        </Glass>
      )}

      {(state === "live" || state === "off") && (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-3">
            {teacher ? (
              <>
                {state === "live" && <VideoTile lk={lk} source="screen" identity="me" />}
                {state === "live" && <VideoTile lk={lk} source="camera" identity="me" className={hasScreen ? "max-w-48" : ""} />}
                {deck && <SlideView slide={deck.slides[Math.min(idx, deck.slides.length - 1)]} index={idx} total={deck.slides.length} />}
                <Glass className="flex flex-wrap items-center gap-2 p-3">
                  {state === "live" && <>
                    <Button onClick={() => void toggle("mic")} variant={mic ? "teal" : "ghost"} aria-pressed={mic}>{mic ? <Mic size={16} /> : <MicOff size={16} />}Mic</Button>
                    <Button onClick={() => void toggle("cam")} variant={cam ? "teal" : "ghost"} aria-pressed={cam}>{cam ? <Video size={16} /> : <VideoOff size={16} />}Camera</Button>
                    <Button onClick={() => void toggle("screen")} variant={sharing ? "danger" : "ghost"} aria-pressed={sharing}><MonitorUp size={16} />{sharing ? "Stop sharing" : "Share screen"}</Button>
                  </>}
                  <select value={deck?.id ?? ""} onChange={(e) => { setDeck(decks.find((d) => d.id === e.target.value) ?? null); setIdx(0); }} aria-label="Slides to present" className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink">
                    <option value="">Choose slides…</option>{decks.map((d) => <option key={d.id} value={d.id}>{d.topic}</option>)}
                  </select>
                  <Button onClick={() => setPresenting(true)} disabled={!deck}><Presentation size={16} />Present</Button>
                  {recState.on ? <Button variant="danger" onClick={() => void stopRecording()}><Square size={16} />Stop and save</Button> : <Button onClick={() => void startRecording()}><Circle size={16} className="text-bad-t" />Record</Button>}
                  <Button variant="danger" onClick={() => void end()} className="ml-auto">End class</Button>
                </Glass>
                {recState.on && <p className="text-xs text-mute" role="status">{recState.parts} segment(s) uploaded{recState.failed ? `, ${recState.failed} failed` : ""}. Keep this tab open until you press Stop and save.</p>}
                {Object.keys(hands).length > 0 && (
                  <Glass className="p-3"><p className="mb-1 flex items-center gap-1 text-sm font-semibold text-brand-t"><Hand size={14} />Raised hands</p>
                    <ul className="flex flex-wrap gap-2">{Object.entries(hands).map(([id, name]) => <li key={id}><button onClick={() => setHands((h) => { const n = { ...h }; delete n[id]; return n; })} className="min-h-9 rounded-full border border-brand/40 px-3 text-sm text-brand-t">{name} ✕</button></li>)}</ul></Glass>
                )}
              </>
            ) : (
              <>
                <VideoTile lk={lk} source="screen" identity="teacher" />
                {incoming ? <SlideView slide={incoming.slide} index={incoming.index} total={incoming.total} /> : !hasScreen && <Glass className="grid aspect-video place-items-center p-6 text-center text-sm text-ink-2">Waiting for your teacher to share slides or their screen…</Glass>}
                <VideoTile lk={lk} source="camera" identity="teacher" className="max-w-xs" />
                <Button onClick={raise} variant={handUp ? "gold" : "ghost"} aria-pressed={handUp}><Hand size={16} />{handUp ? "Lower hand" : "Raise hand"}</Button>
              </>
            )}
          </div>

          {state === "live" && (
            <Glass className="flex h-[26rem] flex-col p-3 lg:h-auto lg:min-h-[24rem]">
              <p className="mb-2 text-sm font-bold text-ink">Class chat</p>
              <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto text-sm" aria-live="polite">
                {chat.length === 0 && <li className="text-mute">Ask questions here.</li>}
                {chat.map((m) => <li key={m.id} className={m.mine ? "text-right" : ""}><span className="mono text-[11px] text-sky-t">{m.from}</span><p className={cx("inline-block max-w-full rounded-lg px-2.5 py-1.5 text-left", m.mine ? "bg-brand/20 text-brand-t" : "bg-sunken text-ink")}>{m.text}</p></li>)}
              </ul>
              <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="mt-2 flex gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={400} placeholder="Message" aria-label="Chat message" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-ink" />
                <Button variant="gold" type="submit" aria-label="Send"><Send size={16} /></Button>
              </form>
            </Glass>
          )}
        </div>
      )}

      {presenting && deck && (
        <Presenter deck={deck} index={idx} onIndex={setIdx} onClose={() => setPresenting(false)} onShare={state === "live" ? () => void toggle("screen") : undefined} sharing={sharing} />
      )}
    </div>
  );
}
