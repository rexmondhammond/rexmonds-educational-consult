import { extensionFor, pickMimeType } from "./recorder";
import { supabase } from "./supabase";

export interface LessonPart { path: string; seconds: number; mime: string }

/**
 * Records a stream in short standalone segments (each segment is a playable file) and uploads
 * them as it goes, so a dropped connection or closed tab loses at most a few minutes.
 */
export class SegmentedRecorder {
  private rec: MediaRecorder | null = null;
  private timer: number | undefined;
  private startedAt = 0;
  private n = 0;
  private stopping = false;
  private queue: Promise<void> = Promise.resolve();
  parts: LessonPart[] = [];
  failed = 0;

  constructor(
    private stream: MediaStream,
    private prefix: string,
    private onChange: (state: { parts: number; failed: number }) => void,
    private segmentMs = 4 * 60 * 1000,
  ) {}

  static supported(): boolean { return typeof MediaRecorder !== "undefined" && !!pickMimeType(); }

  start() {
    this.stopping = false;
    this.begin();
  }

  private begin() {
    const mime = pickMimeType() ?? "video/webm";
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(this.stream, { mimeType: mime, videoBitsPerSecond: 900_000, audioBitsPerSecond: 64_000 });
    this.rec = rec;
    this.startedAt = Date.now();
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const seconds = Math.round((Date.now() - this.startedAt) / 1000);
      const blob = new Blob(chunks, { type: mime });
      const index = this.n++;
      if (blob.size > 0 && seconds > 0) this.queue = this.queue.then(() => this.upload(blob, mime, seconds, index));
      if (!this.stopping) this.begin();
    };
    rec.start(1000);
    this.timer = window.setTimeout(() => { if (rec.state === "recording") rec.stop(); }, this.segmentMs);
  }

  private async upload(blob: Blob, mime: string, seconds: number, index: number) {
    const path = `${this.prefix}/${String(index).padStart(3, "0")}.${extensionFor(mime)}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.storage.from("lessons").upload(path, blob, { contentType: mime.split(";")[0], upsert: false });
      if (!error) { this.parts.push({ path, seconds, mime }); this.onChange({ parts: this.parts.length, failed: this.failed }); return; }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    this.failed++;
    this.onChange({ parts: this.parts.length, failed: this.failed });
  }

  /** Stops, waits for every upload to finish, and returns the ordered parts. */
  async finish(): Promise<LessonPart[]> {
    this.stopping = true;
    window.clearTimeout(this.timer);
    if (this.rec && this.rec.state !== "inactive") this.rec.stop();
    await new Promise((r) => setTimeout(r, 200));
    await this.queue;
    return [...this.parts].sort((a, b) => a.path.localeCompare(b.path));
  }
}

/** Mixes several audio sources (microphone, shared tab audio) into one track. */
export function mixAudio(streams: MediaStream[]): { track: MediaStreamTrack | null; close: () => void } {
  const withAudio = streams.filter((s) => s.getAudioTracks().length > 0);
  if (!withAudio.length) return { track: null, close: () => undefined };
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  withAudio.forEach((s) => ctx.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(dest));
  return { track: dest.stream.getAudioTracks()[0] ?? null, close: () => void ctx.close() };
}
