import type { VideoLesson } from "../types";

export const LESSON_W = 960;
export const LESSON_H = 540;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Paints one frame of a built-in board lesson at time t (seconds). */
export function drawLessonFrame(ctx: CanvasRenderingContext2D, lesson: VideoLesson, t: number) {
  ctx.fillStyle = "#0b1a17";
  ctx.fillRect(0, 0, LESSON_W, LESSON_H);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "700 26px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(lesson.title, 32, 52);
  ctx.strokeStyle = "rgba(251,191,36,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(32, 66); ctx.lineTo(LESSON_W - 32, 66); ctx.stroke();

  // Revealed lecture lines (typewriter effect for the newest line).
  ctx.font = "500 19px 'JetBrains Mono', monospace";
  let y = 108;
  const maxW = 470;
  for (const line of lesson.transcript) {
    if (t < line.at) break;
    const reveal = Math.min(1, (t - line.at) / 2.5);
    const shown = line.text.slice(0, Math.ceil(line.text.length * reveal));
    ctx.fillStyle = "#f8fafc";
    for (const part of wrap(ctx, shown, maxW)) {
      if (y > LESSON_H - 24) return;
      ctx.fillText(part, 32, y);
      y += 28;
    }
    y += 10;
  }
}

/** Right-hand diagram, progressively drawn with the lesson. */
export function drawLessonDiagram(ctx: CanvasRenderingContext2D, lesson: VideoLesson, t: number) {
  const p = Math.max(0, Math.min(1, t / Math.max(1, lesson.duration)));
  const ox = 560;
  const oy = 130;
  const w = 360;
  const h = 330;
  ctx.save();
  ctx.strokeStyle = "rgba(148,163,184,0.3)";
  ctx.strokeRect(ox, oy, w, h);

  if (lesson.id === "demo-quadratics") {
    const cx = ox + w / 2;
    const cy = oy + h * 0.45;
    ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, cy); ctx.lineTo(ox + w, cy); ctx.moveTo(cx, oy); ctx.lineTo(cx, oy + h); ctx.stroke();
    ctx.strokeStyle = "#22d3ee"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 8; ctx.lineWidth = 3.5;
    ctx.beginPath();
    const maxX = 4.5;
    const limit = -maxX + 2 * maxX * Math.min(1, p * 1.2);
    for (let x = -maxX; x <= limit; x += 0.05) {
      const sx = cx + x * 36;
      const sy = cy - ((x - 2.5) * (x - 2.5) - 0.25) * 12 + 0; // y = x² - 5x + 6 shifted for display
      if (x === -maxX) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fbbf24";
    ctx.font = "600 16px 'JetBrains Mono', monospace";
    if (p > 0.6) ctx.fillText("roots: x = 2, x = 3", ox + 16, oy + h - 16);
  } else if (lesson.id === "demo-ohm") {
    ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 3;
    ctx.strokeRect(ox + 40, oy + 60, w - 80, 180);
    ctx.fillStyle = "#0b1a17";
    ctx.fillRect(ox + 100, oy + 50, 70, 20);
    ctx.fillRect(ox + 210, oy + 50, 70, 20);
    ctx.strokeStyle = "#fbbf24";
    ctx.strokeRect(ox + 100, oy + 50, 70, 20);
    ctx.strokeRect(ox + 210, oy + 50, 70, 20);
    ctx.fillStyle = "#fbbf24"; ctx.font = "600 16px 'JetBrains Mono', monospace";
    ctx.fillText("4 Ω", ox + 118, oy + 42);
    ctx.fillText("6 Ω", ox + 228, oy + 42);
    ctx.fillStyle = "#f8fafc";
    ctx.fillText("20 V", ox + 12, oy + 160);
    if (p > 0.45) ctx.fillText("R = 4 + 6 = 10 Ω", ox + 70, oy + 290);
    if (p > 0.75) ctx.fillText("I = V / R = 2 A", ox + 70, oy + 316);
  } else {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "600 22px 'JetBrains Mono', monospace";
    ctx.fillText("n = m / M", ox + 90, oy + 100);
    ctx.fillStyle = "#22d3ee";
    if (p > 0.3) ctx.fillText("M(H₂O) = 18 g/mol", ox + 40, oy + 170);
    ctx.fillStyle = "#fbbf24";
    if (p > 0.55) ctx.fillText("n = 36 / 18 = 2 mol", ox + 40, oy + 240);
  }
  ctx.restore();
}
