import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Lightbulb, Pause, Play, Plus, RotateCcw, StickyNote, Trash2, Video } from "lucide-react";
import { useApp } from "../state/AppContext";
import { LESSON_H, LESSON_W, drawLessonDiagram, drawLessonFrame } from "../lib/lessonBoard";
import { getBlob, usePersistentState } from "../lib/storage";
import { formatClock, speak } from "../lib/recorder";
import { Button, Glass, Pill, SectionTitle, cx } from "../components/ui";
import type { Checkpoint, VideoLesson } from "../types";

interface Note { id: number; at: number; text: string }

export default function Player() {
  const { lessons, activeLessonId, openLesson } = useApp();
  const lesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0];

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Interactive video lessons" title="Learn with checkpoints" />
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        {lesson ? <LessonPlayer key={lesson.id} lesson={lesson} /> : <p className="text-slate-400">No lessons yet.</p>}
        <Glass className="h-fit p-4" as="aside">
          <h2 className="mb-3 text-lg font-bold text-white">Lesson library</h2>
          <ul className="space-y-2">
            {lessons.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => openLesson(l.id)} aria-current={l.id === lesson?.id ? "true" : undefined}
                  className={cx("flex min-h-11 w-full items-start gap-3 rounded-xl border p-3 text-left", l.id === lesson?.id ? "border-amber-400/60 bg-amber-400/10" : "border-slate-800 hover:border-slate-600")}
                >
                  <Video className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{l.title}</span>
                    <span className="mono block text-xs text-slate-400">{l.subject} · {formatClock(l.duration)}</span>
                    {l.source === "recorded" && <Pill tone="emerald" className="mt-1">Recorded in Studio</Pill>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Glass>
      </div>
    </div>
  );
}

function LessonPlayer({ lesson }: { lesson: VideoLesson }) {
  const { settings, recordQuiz, progress, celebrate } = useApp();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [chosen, setChosen] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [notesByLesson, setNotesByLesson] = usePersistentState<Record<string, Note[]>>("rex.notes.v1", {});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLOListElement>(null);
  const lastSpoken = useRef(-1);

  const isRecorded = lesson.source === "recorded";
  const total = lesson.checkpoints.length;
  const notes = notesByLesson[lesson.id] ?? [];
  const checkpoint: Checkpoint | null = active !== null ? lesson.checkpoints[active] ?? null : null;

  /* load recorded blob */
  useEffect(() => {
    if (!isRecorded || !lesson.blobKey) return;
    let url: string | null = null;
    let cancelled = false;
    void getBlob(lesson.blobKey).then((b) => {
      if (cancelled) return;
      if (!b) { setLoadError("This recording is no longer stored on this device. Re-publish it from the Live Studio."); return; }
      url = URL.createObjectURL(b);
      setVideoUrl(url);
    });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [isRecorded, lesson.blobKey]);

  /* unified controls */
  const play = useCallback(() => {
    if (checkpoint) return;
    if (time >= lesson.duration - 0.2) setTime(0);
    if (isRecorded) {
      const v = videoRef.current;
      if (v) { if (time >= lesson.duration - 0.2) v.currentTime = 0; void v.play().catch(() => setLoadError("Playback was blocked by the browser.")); }
    }
    setPlaying(true);
  }, [checkpoint, isRecorded, lesson.duration, time]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, []);

  const seek = useCallback((t: number) => {
    const clamped = Math.max(0, Math.min(lesson.duration, t));
    setTime(clamped);
    if (videoRef.current) videoRef.current.currentTime = clamped;
    lastSpoken.current = -1;
  }, [lesson.duration]);

  /* virtual clock for board lessons */
  useEffect(() => {
    if (isRecorded || !playing) return;
    const id = window.setInterval(() => {
      setTime((t) => {
        const next = t + 0.1 * 1;
        if (next >= lesson.duration) { setPlaying(false); return lesson.duration; }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [isRecorded, playing, lesson.duration]);

  /* recorded video time sync */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isRecorded) return;
    const onTime = () => setTime(v.currentTime);
    const onEnd = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("ended", onEnd); };
  }, [isRecorded, videoUrl]);

  /* checkpoint trigger: pause at the exact pedagogical timestamp */
  useEffect(() => {
    if (checkpoint || !playing) return;
    const idx = lesson.checkpoints.findIndex((c, i) => answers[i] === undefined && time >= c.at && time - c.at < 2);
    if (idx >= 0) {
      pause();
      setActive(idx);
      setChosen(null);
      setShowHint(false);
      setSubmitted(false);
    }
  }, [time, playing, checkpoint, lesson.checkpoints, answers, pause]);

  /* board rendering */
  useEffect(() => {
    if (isRecorded) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawLessonFrame(ctx, lesson, time);
    drawLessonDiagram(ctx, lesson, time);
  }, [isRecorded, lesson, time]);

  /* audio-only mode narrates the board lesson */
  useEffect(() => {
    if (!settings.audioOnly || isRecorded || !playing) return;
    const idx = lesson.transcript.reduce((acc, l, i) => (time >= l.at ? i : acc), -1);
    if (idx >= 0 && idx !== lastSpoken.current) {
      lastSpoken.current = idx;
      speak(lesson.transcript[idx].text);
    }
  }, [settings.audioOnly, isRecorded, playing, time, lesson.transcript]);

  /* transcript auto-scroll within its own container only */
  const activeLine = lesson.transcript.reduce((acc, l, i) => (time >= l.at ? i : acc), -1);
  useEffect(() => {
    const list = transcriptRef.current;
    const el = list?.children[activeLine] as HTMLElement | undefined;
    if (list && el) list.scrollTo({ top: el.offsetTop - list.offsetTop - 8, behavior: "smooth" });
  }, [activeLine]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const submit = () => {
    if (chosen === null || active === null) return;
    setSubmitted(true);
    setAnswers((a) => ({ ...a, [active]: chosen }));
  };

  const cont = () => {
    const next = { ...answers };
    setActive(null);
    setSubmitted(false);
    if (Object.keys(next).length === total && total > 0) {
      const score = lesson.checkpoints.reduce((n, c, i) => n + (next[i] === c.correct ? 1 : 0), 0);
      const had = progress.quizMastery[lesson.id] ?? 0;
      recordQuiz(lesson.id, score, total);
      if (score === total && had >= 100) celebrate();
    }
    play();
  };

  const retake = () => { setAnswers({}); seek(0); setPlaying(false); };

  const score = lesson.checkpoints.reduce((n, c, i) => n + (answers[i] === c.correct ? 1 : 0), 0);
  const answered = Object.keys(answers).length;

  const addNote = () => {
    const text = noteText.trim();
    if (!text) return;
    setNotesByLesson((all) => ({ ...all, [lesson.id]: [...(all[lesson.id] ?? []), { id: Date.now(), at: time, text }].sort((a, b) => a.at - b.at) }));
    setNoteText("");
  };

  const compressed = settings.dataSaver;

  return (
    <div className="space-y-4">
      <Glass className="overflow-hidden p-0">
        <div className="relative bg-black" style={{ aspectRatio: `${LESSON_W} / ${LESSON_H}` }}>
          {settings.audioOnly && !isRecorded ? (
            <div className="grid h-full place-items-center bg-slate-950 text-center">
              <div><Headphones className="mx-auto h-12 w-12 text-cyan-300" /><p className="mt-2 text-sm text-slate-300">Audio-only mode: the lecture is read aloud to save data.</p></div>
            </div>
          ) : isRecorded ? (
            videoUrl ? (
              <video
                ref={videoRef} src={videoUrl} playsInline preload={compressed ? "metadata" : "auto"}
                className={cx("h-full w-full", settings.audioOnly && "opacity-0")}
                aria-label={lesson.title}
                onError={() => setLoadError("This recording could not be decoded in your browser.")}
              />
            ) : <div className="grid h-full place-items-center text-sm text-slate-400">{loadError ?? "Loading recording…"}</div>
          ) : (
            <canvas ref={canvasRef} width={LESSON_W} height={LESSON_H} className="h-full w-full" role="img" aria-label={`Board lesson: ${lesson.title}`} />
          )}

          {checkpoint && (
            <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-slate-950/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Checkpoint question">
              <div className="rise w-full max-w-xl space-y-3">
                <Pill tone="amber">Checkpoint {(active ?? 0) + 1} of {total}</Pill>
                <p className="text-base font-bold text-white sm:text-lg">{checkpoint.question}</p>
                <div className="grid gap-2" role="radiogroup" aria-label="Answer options">
                  {checkpoint.options.map((o, i) => {
                    const isCorrect = i === checkpoint.correct;
                    return (
                      <button
                        key={o} role="radio" aria-checked={chosen === i} disabled={submitted} onClick={() => setChosen(i)}
                        className={cx(
                          "min-h-11 rounded-xl border px-3 text-left text-sm",
                          submitted ? (isCorrect ? "border-emerald-400 bg-emerald-400/10" : chosen === i ? "border-red-400 bg-red-500/10" : "border-slate-700 opacity-60")
                            : chosen === i ? "border-amber-400 bg-amber-400/10" : "border-slate-700 hover:border-slate-500",
                        )}
                      >
                        <span className="mono mr-2 text-amber-300">{"ABCD"[i]}.</span>{o}
                      </button>
                    );
                  })}
                </div>
                {showHint && !submitted && <p className="rounded-lg bg-cyan-400/10 p-3 text-sm text-cyan-100"><Lightbulb className="mr-1 inline h-4 w-4" />{checkpoint.hint}</p>}
                {submitted && (
                  <p className={cx("rounded-lg p-3 text-sm", chosen === checkpoint.correct ? "bg-emerald-400/10 text-emerald-100" : "bg-red-500/10 text-red-100")} role="status">
                    <b>{chosen === checkpoint.correct ? "Correct. " : "Not quite. "}</b>WAEC rationale: {checkpoint.rationale}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!submitted && <Button variant="ghost" onClick={() => setShowHint(true)} disabled={showHint}><Lightbulb className="h-4 w-4" /> Hint</Button>}
                  {!submitted ? <Button variant="gold" onClick={submit} disabled={chosen === null}>Check answer</Button> : <Button variant="teal" onClick={cont}>Continue lesson</Button>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-center gap-3">
            <Button variant="gold" onClick={playing ? pause : play} aria-label={playing ? "Pause" : "Play"} disabled={!!checkpoint || (isRecorded && !videoUrl)}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="mono w-24 text-xs text-slate-300">{formatClock(time)} / {formatClock(lesson.duration)}</span>
            <div className="relative flex-1">
              <input
                type="range" min={0} max={lesson.duration} step={0.5} value={time} aria-label="Seek"
                onChange={(e) => seek(Number(e.target.value))} className="h-11 w-full accent-amber-400"
              />
              {lesson.checkpoints.map((c, i) => (
                <span key={i} className={cx("pointer-events-none absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded", answers[i] === undefined ? "bg-cyan-300" : answers[i] === c.correct ? "bg-emerald-400" : "bg-red-400")} style={{ left: `${(c.at / lesson.duration) * 100}%` }} aria-hidden />
              ))}
            </div>
          </div>
          {loadError && <p role="alert" className="text-sm text-red-300">{loadError}</p>}
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="mono">Checkpoints: {answered}/{total} answered · score {score}/{total}</span>
              {answered === total && <Button variant="ghost" onClick={retake}><RotateCcw className="h-4 w-4" /> Retake</Button>}
            </div>
          )}
        </div>
      </Glass>

      <div className="grid gap-4 lg:grid-cols-2">
        <Glass className="p-4" as="section">
          <h2 className="mb-2 text-lg font-bold text-white">Transcript</h2>
          {lesson.transcript.length === 0 ? (
            <p className="text-sm text-slate-500">This recording has no transcript. Add timestamped notes instead.</p>
          ) : (
            <ol ref={transcriptRef} className="scroll-thin relative max-h-72 space-y-1 overflow-y-auto">
              {lesson.transcript.map((l, i) => (
                <li key={l.at}>
                  <button
                    onClick={() => seek(l.at)}
                    className={cx("flex min-h-11 w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-sm", i === activeLine ? "bg-amber-400/10 text-amber-100" : "text-slate-300 hover:bg-slate-800/60")}
                  >
                    <span className="mono shrink-0 text-xs text-cyan-300 underline">{formatClock(l.at)}</span>
                    <span>{l.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Glass>

        <Glass className="p-4" as="section">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-white"><StickyNote className="h-5 w-5 text-amber-400" /> My time-linked notes</h2>
          <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addNote(); }}>
            <label className="sr-only" htmlFor="note-input">Note at current time</label>
            <input id="note-input" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder={`Note at ${formatClock(time)}…`}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500" />
            <Button variant="gold" type="submit" aria-label="Add note"><Plus className="h-4 w-4" /></Button>
          </form>
          <ul className="scroll-thin max-h-60 space-y-1 overflow-y-auto">
            {useMemo(() => notes, [notes]).map((n) => (
              <li key={n.id} className="flex items-start gap-2 rounded-lg border border-slate-800 p-2">
                <button onClick={() => seek(n.at)} className="mono min-h-11 shrink-0 px-1 text-xs text-cyan-300 underline">{formatClock(n.at)}</button>
                <span className="flex-1 py-2 text-sm text-slate-200">{n.text}</span>
                <button
                  aria-label="Delete note" className="grid min-h-11 min-w-11 place-items-center text-slate-500 hover:text-red-300"
                  onClick={() => setNotesByLesson((all) => ({ ...all, [lesson.id]: (all[lesson.id] ?? []).filter((x) => x.id !== n.id) }))}
                ><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {notes.length === 0 && <li className="text-sm text-slate-500">No notes yet. Pause the lesson and add one.</li>}
          </ul>
        </Glass>
      </div>
    </div>
  );
}
