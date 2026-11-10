import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize, MonitorUp, StickyNote, X } from "lucide-react";
import type { Deck } from "../lib/deck";
import { SlideView } from "./SlideView";
import { Button, cx } from "./ui";

interface Props {
  deck: Deck;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** When set, the presenter is part of a live class and shares its own screen via the room. */
  extra?: React.ReactNode;
  /** Live classes share the screen through the room instead of a local preview. */
  onShare?: () => void;
  sharing?: boolean;
}

/** Full-screen teaching view: arrow keys, speaker notes, answer reveal and a local screen-share preview. */
export function Presenter({ deck, index, onIndex, onClose, extra, onShare, sharing }: Props) {
  const [notes, setNotes] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [shareStream, setShareStream] = useState<MediaStream | null>(null);
  const [shareError, setShareError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const last = deck.slides.length - 1;
  const slide = deck.slides[Math.min(index, last)];

  const go = useCallback((d: number) => { setReveal(false); onIndex(Math.max(0, Math.min(last, index + d))); }, [index, last, onIndex]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(1); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "r") setReveal((v) => !v);
      else if (e.key.toLowerCase() === "n") setNotes((v) => !v);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go, onClose]);

  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = shareStream; }, [shareStream]);
  useEffect(() => () => shareStream?.getTracks().forEach((t) => t.stop()), [shareStream]);

  const share = async () => {
    setShareError("");
    if (shareStream) { shareStream.getTracks().forEach((t) => t.stop()); setShareStream(null); return; }
    if (!navigator.mediaDevices?.getDisplayMedia) { setShareError("Screen sharing is not supported in this browser. Use Chrome or Edge on a computer."); return; }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      s.getVideoTracks()[0]?.addEventListener("ended", () => setShareStream(null));
      setShareStream(s);
    } catch (e) {
      setShareError(e instanceof DOMException && e.name === "NotAllowedError" ? "Screen sharing was cancelled." : "Could not start screen sharing.");
    }
  };

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 flex flex-col bg-slate-950" role="dialog" aria-modal="true" aria-label={`Presenting ${deck.topic}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 p-2">
        <p className="mr-auto truncate px-2 text-sm font-semibold text-slate-200">{deck.topic}</p>
        {extra}
        <Button onClick={() => setReveal((v) => !v)} aria-pressed={reveal}>{reveal ? <EyeOff size={16} /> : <Eye size={16} />}<span className="hidden sm:inline">Answers</span></Button>
        <Button onClick={() => setNotes((v) => !v)} aria-pressed={notes}><StickyNote size={16} /><span className="hidden sm:inline">Notes</span></Button>
        <Button onClick={onShare ?? share} variant={(onShare ? sharing : shareStream) ? "danger" : "ghost"}><MonitorUp size={16} /><span className="hidden sm:inline">{(onShare ? sharing : shareStream) ? "Stop sharing" : "Share screen"}</span></Button>
        <Button onClick={() => void rootRef.current?.requestFullscreen?.()} aria-label="Full screen"><Maximize size={16} /></Button>
        <Button onClick={onClose} aria-label="Close presenter"><X size={16} /></Button>
      </div>
      {shareError && <p className="bg-red-500/10 p-2 text-center text-sm text-red-300" role="alert">{shareError}</p>}
      <div className={cx("grid min-h-0 flex-1 gap-3 p-3", notes || shareStream ? "lg:grid-cols-[1fr_22rem]" : "")}>
        <div className="grid min-h-0 place-items-center">
          <div className="w-full max-w-[min(100%,calc((100vh-9rem)*16/9))]"><SlideView slide={slide} index={index} total={deck.slides.length} reveal={reveal} /></div>
        </div>
        {(notes || shareStream) && (
          <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
            {shareStream && <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl border border-slate-700 bg-black" aria-label="Your shared screen" />}
            {notes && (
              <div className="glass rounded-xl p-4">
                <p className="mono text-xs uppercase tracking-widest text-cyan-300">Speaker notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{slide.notes || "No notes for this slide."}</p>
                <p className="mono mt-3 text-[11px] text-slate-500">← → move · R answers · N notes · Esc exit</p>
              </div>
            )}
          </aside>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 border-t border-slate-800 p-2">
        <Button onClick={() => go(-1)} disabled={index === 0} aria-label="Previous slide"><ChevronLeft size={18} /></Button>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-800 sm:w-72"><div className="h-full bg-amber-400 transition-all" style={{ width: `${((index + 1) / deck.slides.length) * 100}%` }} /></div>
        <span className="mono text-xs text-slate-400">{index + 1}/{deck.slides.length}</span>
        <Button onClick={() => go(1)} disabled={index === last} aria-label="Next slide"><ChevronRight size={18} /></Button>
      </div>
    </div>
  );
}
