export const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp9",
  "video/webm",
  "video/mp4",
] as const;

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return null;
  for (const m of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* try next */
    }
  }
  return null;
}

export const extensionFor = (mime: string): "webm" | "mp4" => (mime.includes("mp4") ? "mp4" : "webm");

export type MediaIssue = { kind: "denied" | "missing" | "busy" | "insecure" | "unknown"; message: string };

export function describeMediaError(err: unknown, device: "camera" | "microphone"): MediaIssue {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return { kind: "denied", message: `${device === "camera" ? "Camera" : "Microphone"} permission was blocked. Allow it in your browser's site settings (iframes also need allow="camera; microphone").` };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return { kind: "missing", message: `No ${device} was found on this device.` };
  }
  if (name === "NotReadableError") {
    return { kind: "busy", message: `The ${device} is in use by another app.` };
  }
  return { kind: "unknown", message: `Could not start the ${device}.` };
}

export async function requestMedia(constraints: MediaStreamConstraints, device: "camera" | "microphone"): Promise<{ stream: MediaStream | null; issue: MediaIssue | null }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, issue: { kind: "insecure", message: `${device === "camera" ? "Camera" : "Microphone"} access needs a secure (HTTPS) page and a supporting browser.` } };
  }
  try {
    return { stream: await navigator.mediaDevices.getUserMedia(constraints), issue: null };
  } catch (err) {
    return { stream: null, issue: describeMediaError(err, device) };
  }
}

export function speak(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GH";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export const formatClock = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
