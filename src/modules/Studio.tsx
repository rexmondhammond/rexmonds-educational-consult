import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Camera, CameraOff, Download, Eraser, Hand, Mic, Radio, Rocket, Square, Trash2, Undo2, Video, Volume2 } from "lucide-react";
import { useApp } from "../state/AppContext";
import { BOARD_BG, BOARD_H, BOARD_W, CHALK_COLORS, STAMPS, renderBoard, type BoardOp, type StampKind, type StrokeOp } from "../lib/board";
import { extensionFor, formatClock, pickMimeType, requestMedia, speak } from "../lib/recorder";
import { putBlob } from "../lib/storage";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";

type Mode = "broadcast" | "record";

interface Raised {
  id: number;
  student: string;
  school: string;
  question: string;
}

const SCHOOLS = ["PRESEC Legon", "Wesley Girls", "Achimota", "Prempeh", "Holy Child"];
const NAMES = ["Kwame A.", "Abena O.", "Yaw M.", "Efua T.", "Kofi B.", "Ama S.", "Nana K.", "Akosua D."];
const QUESTIONS = [
  "Sir, why do we reject a negative root when finding a length?",
  "Please, can you repeat how to find the vertex of a parabola?",
  "Is the unit circle radius always 1 in WASSCE questions?",
  "How many electrons can the third shell hold?",
  "What is the difference between sin and cos on the circle?",
  "Can we get method marks if the final answer is wrong?",
];

const mulberry = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export default function Studio() {
  const { publishLesson, setView, openLesson, settings } = useApp();

  const [mode, setMode] = useState<Mode>("record");
  const [color, setColor] = useState<string>(CHALK_COLORS[0].value);
  const [width, setWidth] = useState(5);
  const [eraser, setEraser] = useState(false);
  const [opCount, setOpCount] = useState(0);

  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [pip, setPip] = useState({ x: 82, y: 70 });
  const [notice, setNotice] = useState<string | null>(null);

  const [live, setLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [viewers, setViewers] = useState(0);

  const [clip, setClip] = useState<{ url: string; blob: Blob; mime: string; seconds: number } | null>(null);
  const [title, setTitle] = useState("My lecture recording");
  const [subject, setSubject] = useState("Core Mathematics");
  const [published, setPublished] = useState<string | null>(null);

  const [queue, setQueue] = useState<Raised[]>([]);
  const [spotlight, setSpotlight] = useState<Raised | null>(null);

  const boardRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const opsRef = useRef<BoardOp[]>([]);
  const drawingRef = useRef<StrokeOp | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const compositeTimer = useRef<number | null>(null);
  const clockTimer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const pipRef = useRef(pip);
  const spotRef = useRef<Raised | null>(null);
  const camOnRef = useRef(false);
  const idRef = useRef(1);
  const rng = useRef(mulberry(Date.now() % 100000));
  const clipUrlRef = useRef<string | null>(null);

  pipRef.current = pip;
  spotRef.current = spotlight;
  camOnRef.current = camOn;

  /* ───────── board ───────── */
  const repaint = useCallback(() => {
    const ctx = boardRef.current?.getContext("2d");
    if (ctx) renderBoard(ctx, opsRef.current);
  }, []);

  useEffect(() => { repaint(); }, [repaint]);

  const pointFrom = (e: RPointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * BOARD_W, ((e.clientY - rect.top) / rect.height) * BOARD_H];
  };

  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFrom(e);
    const stroke: StrokeOp = { type: "stroke", color: eraser ? BOARD_BG : color, width: eraser ? width * 4 : width, pts: [p] };
    drawingRef.current = stroke;
    const ctx = boardRef.current?.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.fillStyle = stroke.color;
      ctx.beginPath(); ctx.arc(p[0], p[1], stroke.width / 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const s = drawingRef.current;
    if (!s) return;
    const p = pointFrom(e);
    const prev = s.pts[s.pts.length - 1];
    s.pts.push(p);
    const ctx = boardRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    if (s.color !== BOARD_BG) { ctx.shadowColor = s.color; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
    ctx.restore();
  };

  const onUp = () => {
    const s = drawingRef.current;
    drawingRef.current = null;
    if (s) {
      opsRef.current = [...opsRef.current, s];
      setOpCount(opsRef.current.length);
    }
  };

  const undo = () => {
    opsRef.current = opsRef.current.slice(0, -1);
    setOpCount(opsRef.current.length);
    repaint();
  };
  const clearBoard = () => {
    opsRef.current = [];
    setOpCount(0);
    repaint();
  };
  const stamp = (kind: StampKind) => {
    opsRef.current = [...opsRef.current, { type: "stamp", kind }];
    setOpCount(opsRef.current.length);
    repaint();
  };

  /* ───────── webcam ───────── */
  const stopCam = useCallback(() => {
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    setCamOn(false);
  }, []);

  const toggleCam = async () => {
    if (camOn) { stopCam(); return; }
    const { stream, issue } = await requestMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false }, "camera");
    if (!stream) { setNotice(issue?.message ?? "Camera unavailable."); return; }
    camStreamRef.current = stream;
    setCamOn(true);
    setNotice(null);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (camOn && v && camStreamRef.current) {
      v.srcObject = camStreamRef.current;
      void v.play().catch(() => setNotice("Tap the camera preview to start playback."));
    }
  }, [camOn]);

  const onPipDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.drag = "1";
  };
  const onPipMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.dataset.drag !== "1") return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPip({
      x: Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(10, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100)),
    });
  };
  const onPipUp = (e: RPointerEvent<HTMLDivElement>) => { delete e.currentTarget.dataset.drag; };

  /* ───────── recording pipeline ───────── */
  const stopTimers = useCallback(() => {
    if (compositeTimer.current !== null) window.clearInterval(compositeTimer.current);
    if (clockTimer.current !== null) window.clearInterval(clockTimer.current);
    compositeTimer.current = null;
    clockTimer.current = null;
  }, []);

  const startRecording = async () => {
    setNotice(null);
    setPublished(null);
    const mime = pickMimeType();
    const board = boardRef.current;
    if (!mime || !board || typeof board.captureStream !== "function") {
      setNotice("This browser cannot record the chalkboard (MediaRecorder or canvas capture unsupported). Try current Chrome, Edge or Firefox.");
      return;
    }

    // Composite canvas = chalkboard + webcam bubble + spotlighted question, so the file matches what students see.
    const comp = document.createElement("canvas");
    comp.width = BOARD_W;
    comp.height = BOARD_H;
    const cctx = comp.getContext("2d");
    if (!cctx) { setNotice("Canvas 2D is unavailable."); return; }

    const mic = await requestMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }, "microphone");
    if (mic.stream) { micStreamRef.current = mic.stream; setMicOn(true); }
    else setNotice(`${mic.issue?.message ?? "Microphone unavailable."} Recording continues without audio.`);

    const drawComposite = () => {
      cctx.drawImage(board, 0, 0, BOARD_W, BOARD_H);
      const v = videoRef.current;
      if (camOnRef.current && v && v.readyState >= 2) {
        const d = 200;
        const cx = (pipRef.current.x / 100) * BOARD_W;
        const cy = (pipRef.current.y / 100) * BOARD_H;
        cctx.save();
        cctx.beginPath(); cctx.arc(cx, cy, d / 2, 0, Math.PI * 2); cctx.clip();
        const side = Math.min(v.videoWidth, v.videoHeight) || 1;
        cctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, cx - d / 2, cy - d / 2, d, d);
        cctx.restore();
        cctx.strokeStyle = "#fbbf24"; cctx.lineWidth = 5;
        cctx.beginPath(); cctx.arc(cx, cy, d / 2, 0, Math.PI * 2); cctx.stroke();
      }
      const q = spotRef.current;
      if (q) {
        cctx.fillStyle = "rgba(3,7,18,0.85)";
        cctx.fillRect(60, 40, BOARD_W - 120, 120);
        cctx.fillStyle = "#fbbf24";
        cctx.font = "700 20px 'Plus Jakarta Sans', sans-serif";
        cctx.fillText(`${q.student} · ${q.school}`, 84, 80);
        cctx.fillStyle = "#f8fafc";
        cctx.font = "600 24px 'Plus Jakarta Sans', sans-serif";
        cctx.fillText(q.question.length > 80 ? `${q.question.slice(0, 77)}…` : q.question, 84, 124);
      }
    };
    drawComposite();
    compositeTimer.current = window.setInterval(drawComposite, 1000 / 30);

    const videoStream = comp.captureStream(30);
    const tracks = [...videoStream.getVideoTracks(), ...(mic.stream?.getAudioTracks() ?? [])];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: settings.dataSaver ? 800_000 : 2_500_000 });
    } catch {
      stopTimers();
      mic.stream?.getTracks().forEach((t) => t.stop());
      setMicOn(false);
      setNotice("Could not start the recorder with the supported format.");
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
    recorder.onstop = () => {
      stopTimers();
      mic.stream?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      setMicOn(false);
      const type = recorder.mimeType || mime;
      const blob = new Blob(chunksRef.current, { type });
      const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
      const url = URL.createObjectURL(blob);
      clipUrlRef.current = url;
      setClip({ url, blob, mime: type, seconds });
      setRecording(false);
    };
    recorder.onerror = () => {
      setNotice("Recording failed. Check storage space and try again.");
      setRecording(false);
      stopTimers();
    };

    recorderRef.current = recorder;
    startedAt.current = Date.now();
    setElapsed(0);
    clockTimer.current = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250);
    recorder.start(1000);
    setRecording(true);
    if (clip) { setClip(null); }
  };

  const stopRecording = () => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  };

  const downloadClip = () => {
    if (!clip) return;
    const a = document.createElement("a");
    a.href = clip.url;
    a.download = `rexmond-lecture-${Date.now()}.${extensionFor(clip.mime)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const publishClip = async () => {
    if (!clip) return;
    const id = `rec-${Date.now()}`;
    const where = await putBlob(id, clip.blob);
    publishLesson({
      id, title: title.trim() || "Untitled lecture", subject, level: "All levels", duration: clip.seconds,
      source: "recorded", blobKey: id, checkpoints: [], transcript: [],
    });
    setPublished(id);
    if (where === "memory") setNotice("Published for this session only: persistent storage is blocked in this browser, so download the file to keep it.");
  };

  /* ───────── live broadcast (simulated room) ───────── */
  const goLive = () => {
    setLive(true);
    startedAt.current = Date.now();
    setElapsed(0);
    setViewers(24 + Math.floor(rng.current() * 30));
    if (clockTimer.current === null) {
      clockTimer.current = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250);
    }
  };
  const endLive = () => {
    setLive(false);
    setViewers(0);
    if (!recording && clockTimer.current !== null) { window.clearInterval(clockTimer.current); clockTimer.current = null; }
    window.speechSynthesis?.cancel();
  };

  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => {
      setViewers((v) => Math.max(5, v + Math.round((rng.current() - 0.4) * 6)));
      setQueue((q) => {
        if (q.length >= 6) return q;
        const r = rng.current;
        return [...q, {
          id: idRef.current++,
          student: NAMES[Math.floor(r() * NAMES.length)],
          school: SCHOOLS[Math.floor(r() * SCHOOLS.length)],
          question: QUESTIONS[Math.floor(r() * QUESTIONS.length)],
        }];
      });
    }, 9000);
    return () => window.clearInterval(t);
  }, [live]);

  const callOn = (q: Raised) => {
    setSpotlight(q);
    setQueue((cur) => cur.filter((x) => x.id !== q.id));
    const ok = speak(`${q.student} from ${q.school} asks: ${q.question}`);
    if (!ok) setNotice("Text-to-speech is not supported in this browser, but the question is spotlighted on the board.");
  };

  const raiseNow = () => {
    const r = rng.current;
    setQueue((cur) => [...cur.slice(-5), {
      id: idRef.current++,
      student: NAMES[Math.floor(r() * NAMES.length)],
      school: SCHOOLS[Math.floor(r() * SCHOOLS.length)],
      question: QUESTIONS[Math.floor(r() * QUESTIONS.length)],
    }]);
  };

  /* ───────── cleanup ───────── */
  useEffect(() => {
    return () => {
      stopTimers();
      const r = recorderRef.current;
      if (r && r.state !== "inactive") { r.onstop = null; r.stop(); }
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
      window.speechSynthesis?.cancel();
    };
  }, [stopTimers]);

  const swatches = useMemo(() => CHALK_COLORS, []);
  const busy = recording || live;

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Rexmond Live Studio" title="Broadcast & lecture recording">
        <div className="flex items-center gap-2">
          {recording && <Pill tone="red" className="rec-pulse"><span className="h-2 w-2 rounded-full bg-red-500" /> REC {formatClock(elapsed)}</Pill>}
          {live && <Pill tone="red" className="rec-pulse"><Radio className="h-3 w-3" /> LIVE {formatClock(elapsed)} · <span className="mono">{viewers} watching</span></Pill>}
        </div>
      </SectionTitle>

      <div role="tablist" aria-label="Studio mode" className="glass inline-flex rounded-xl p-1">
        {([["record", "Record Lecture Video", Video], ["broadcast", "Live Broadcast to Ghana Scholars", Radio]] as const).map(([id, text, Icon]) => (
          <button
            key={id} role="tab" aria-selected={mode === id} disabled={busy && mode !== id} onClick={() => setMode(id)}
            className={cx("flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold transition disabled:opacity-40", mode === id ? "bg-amber-400 text-slate-950" : "text-slate-300")}
          >
            <Icon className="h-4 w-4" /> {text}
          </button>
        ))}
      </div>

      {notice && <p role="status" className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">{notice}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          <Glass className="p-3">
            <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Chalkboard tools">
              {swatches.map((c) => (
                <button
                  key={c.value} onClick={() => { setColor(c.value); setEraser(false); }} aria-label={c.name} aria-pressed={!eraser && color === c.value}
                  className={cx("h-11 w-11 rounded-full border-2 transition", !eraser && color === c.value ? "scale-110 border-white" : "border-slate-700")}
                  style={{ background: c.value, boxShadow: `0 0 12px ${c.value}66` }}
                />
              ))}
              <Button variant={eraser ? "gold" : "ghost"} onClick={() => setEraser((v) => !v)} aria-pressed={eraser}><Eraser className="h-4 w-4" /> Eraser</Button>
              <label className="flex min-h-11 items-center gap-2 px-2 text-xs text-slate-300">
                Thickness <span className="mono w-5 text-amber-300">{width}</span>
                <input type="range" min={2} max={20} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-28 accent-amber-400" aria-label="Line thickness" />
              </label>
              <Button onClick={undo} disabled={opCount === 0} aria-label="Undo"><Undo2 className="h-4 w-4" /> Undo</Button>
              <Button onClick={clearBoard} disabled={opCount === 0} aria-label="Clear board"><Trash2 className="h-4 w-4" /> Clear</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Diagram stampers">
              {STAMPS.map((s) => <Button key={s.kind} variant="teal" className="text-xs" onClick={() => stamp(s.kind)}>{s.label}</Button>)}
            </div>
          </Glass>

          <div ref={stageRef} className="relative overflow-hidden rounded-2xl border border-slate-700 shadow-2xl" style={{ aspectRatio: `${BOARD_W} / ${BOARD_H}` }}>
            <canvas
              ref={boardRef} width={BOARD_W} height={BOARD_H}
              className="block h-full w-full touch-none cursor-crosshair"
              aria-label="Interactive chalkboard. Draw with mouse, touch or pen."
              role="img"
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            />
            {spotlight && (
              <div className="rise absolute inset-x-3 top-3 rounded-xl border border-amber-400/50 bg-slate-950/90 p-3 sm:inset-x-6" role="status">
                <p className="text-xs font-bold text-amber-300">{spotlight.student} · {spotlight.school}</p>
                <p className="text-sm font-semibold text-white sm:text-base">{spotlight.question}</p>
                <button onClick={() => { setSpotlight(null); window.speechSynthesis?.cancel(); }} className="mt-1 min-h-11 text-xs text-slate-400 underline">Dismiss</button>
              </div>
            )}
            <div
              onPointerDown={onPipDown} onPointerMove={onPipMove} onPointerUp={onPipUp} onPointerCancel={onPipUp}
              className={cx("absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 touch-none overflow-hidden rounded-full border-4 border-amber-400 bg-slate-900 shadow-xl sm:h-32 sm:w-32", !camOn && "hidden")}
              style={{ left: `${pip.x}%`, top: `${pip.y}%` }}
              aria-label="Educator webcam. Drag to move."
            >
              <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
            </div>
          </div>

          <Glass className="flex flex-wrap items-center gap-2 p-3">
            <Button variant={camOn ? "teal" : "ghost"} onClick={() => void toggleCam()} aria-pressed={camOn}>
              {camOn ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />} {camOn ? "Hide webcam" : "Webcam bubble"}
            </Button>
            <span className={cx("inline-flex min-h-11 items-center gap-1 text-xs", micOn ? "text-emerald-300" : "text-slate-500")}><Mic className="h-4 w-4" /> {micOn ? "Mic live" : "Mic off"}</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {mode === "record" ? (
                recording
                  ? <Button variant="danger" onClick={stopRecording}><Square className="h-4 w-4" /> Stop recording</Button>
                  : <Button variant="gold" onClick={() => void startRecording()}><Video className="h-4 w-4" /> Start recording</Button>
              ) : live
                ? <Button variant="danger" onClick={endLive}><Square className="h-4 w-4" /> End broadcast</Button>
                : <Button variant="gold" onClick={goLive}><Radio className="h-4 w-4" /> Go live</Button>}
              {mode === "broadcast" && live && !recording && (
                <Button variant="ghost" onClick={() => void startRecording()}><Video className="h-4 w-4" /> Also record</Button>
              )}
              {mode === "broadcast" && recording && <Button variant="danger" onClick={stopRecording}><Square className="h-4 w-4" /> Stop recording</Button>}
            </div>
            {mode === "broadcast" && (
              <p className="w-full text-xs text-slate-400">
                Broadcast runs as a simulated classroom room (viewers and questions are generated). To stream to real students, connect a WebRTC media server and publish the same board and audio tracks.
              </p>
            )}
          </Glass>

          {clip && (
            <Glass className="space-y-3 p-4" as="section">
              <h2 className="text-lg font-bold text-white">Recording ready · <span className="mono text-sm text-amber-300">{formatClock(clip.seconds)} · {(clip.blob.size / 1024 / 1024).toFixed(2)} MB · .{extensionFor(clip.mime)}</span></h2>
              <video src={clip.url} controls playsInline className="w-full rounded-xl bg-black" aria-label="Recording preview" />
              <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
                <label className="text-xs text-slate-400">Lesson title
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-sm text-white" />
                </label>
                <label className="text-xs text-slate-400">Subject
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                    {["Core Mathematics", "Elective Mathematics", "Physics", "Chemistry", "Biology", "Integrated Science", "English Language", "Economics"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={downloadClip}><Download className="h-4 w-4" /> Download .{extensionFor(clip.mime)}</Button>
                <Button variant="gold" onClick={() => void publishClip()} disabled={published !== null}><Rocket className="h-4 w-4" /> {published ? "Published" : "Publish to video library"}</Button>
                {published && <Button variant="teal" onClick={() => openLesson(published)}>Open in player</Button>}
                {published && <Button variant="ghost" onClick={() => setView("player")}>View library</Button>}
              </div>
            </Glass>
          )}
        </div>

        <Glass className="h-fit p-4" as="aside">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white"><Hand className="h-5 w-5 text-amber-400" /> Raised hands <span className="mono text-sm text-amber-300">({queue.length})</span></h2>
          <p className="mb-3 text-xs text-slate-400">{live ? "Scholars from top schools are asking questions." : "Go live to receive questions, or simulate one."}</p>
          {!live && <Button variant="ghost" className="mb-3 w-full" onClick={raiseNow}>Simulate a raised hand</Button>}
          <ul className="space-y-2" aria-live="polite">
            {queue.map((q) => (
              <li key={q.id} className="rise rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <p className="text-xs font-bold text-cyan-300">{q.student} · {q.school}</p>
                <p className="mt-1 text-sm text-slate-100">{q.question}</p>
                <Button variant="gold" className="mt-2 w-full" onClick={() => callOn(q)}><Volume2 className="h-4 w-4" /> Call on student</Button>
              </li>
            ))}
            {queue.length === 0 && <li className="text-sm text-slate-500">No raised hands right now.</li>}
          </ul>
        </Glass>
      </div>
    </div>
  );
}
