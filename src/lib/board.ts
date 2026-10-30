export const BOARD_W = 1280;
export const BOARD_H = 720;
export const BOARD_BG = "#0b1a17";

export type StampKind = "grid" | "parabola" | "circle" | "bohr";

export interface StrokeOp {
  type: "stroke";
  color: string;
  width: number;
  pts: [number, number][];
}
export interface StampOp {
  type: "stamp";
  kind: StampKind;
}
export type BoardOp = StrokeOp | StampOp;

export const CHALK_COLORS = [
  { name: "Chalk white", value: "#f8fafc" },
  { name: "Neon gold", value: "#fbbf24" },
  { name: "Neon teal", value: "#22d3ee" },
  { name: "Neon green", value: "#4ade80" },
  { name: "Neon pink", value: "#f472b6" },
  { name: "Neon orange", value: "#fb923c" },
] as const;

function drawStroke(ctx: CanvasRenderingContext2D, s: StrokeOp) {
  const { pts } = s;
  if (pts.length === 0) return;
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.color !== BOARD_BG) {
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 6;
  }
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], s.width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.font = "600 20px 'JetBrains Mono', monospace";
  ctx.fillText(text, x, y);
}

function drawStamp(ctx: CanvasRenderingContext2D, kind: StampKind) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const cx = BOARD_W / 2;
  const cy = BOARD_H / 2;

  if (kind === "grid" || kind === "parabola") {
    const step = 40;
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.lineWidth = 1;
    for (let x = cx % step; x <= BOARD_W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, BOARD_H); ctx.stroke();
    }
    for (let y = cy % step; y <= BOARD_H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(BOARD_W, y); ctx.stroke();
    }
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(BOARD_W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, BOARD_H); ctx.stroke();
    label(ctx, "x", BOARD_W - 28, cy - 10, "#f8fafc");
    label(ctx, "y", cx + 12, 26, "#f8fafc");
    label(ctx, "O", cx + 8, cy + 24, "#f8fafc");
    if (kind === "parabola") {
      ctx.strokeStyle = "#fbbf24";
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let px = -8; px <= 8; px += 0.1) {
        const sx = cx + px * step;
        const sy = cy - (px * px - 4) * (step / 2); // y = (x² - 4) scaled to half-height steps
        if (px === -8) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      label(ctx, "y = x² - 4", cx + 6 * step, cy - 14 * (step / 2) + 40, "#fbbf24");
      label(ctx, "(0, -4)", cx + 10, cy + 4 * (step / 2) + 24, "#22d3ee");
    }
  }

  if (kind === "circle") {
    const r = 220;
    ctx.strokeStyle = "rgba(148,163,184,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - r - 40, cy); ctx.lineTo(cx + r + 40, cy); ctx.moveTo(cx, cy - r - 40); ctx.lineTo(cx, cy + r + 40); ctx.stroke();
    ctx.strokeStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 8;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    const angles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
    ctx.lineWidth = 1.5;
    for (const a of angles) {
      const rad = (a * Math.PI) / 180;
      const x = cx + r * Math.cos(rad);
      const y = cy - r * Math.sin(rad);
      ctx.strokeStyle = "rgba(251,191,36,0.55)";
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      label(ctx, `${a}°`, cx + (r + 30) * Math.cos(rad) - 18, cy - (r + 30) * Math.sin(rad) + 7, "#f8fafc");
    }
    label(ctx, "(1, 0)", cx + r + 14, cy + 28, "#4ade80");
    label(ctx, "(0, 1)", cx + 10, cy - r - 14, "#4ade80");
  }

  if (kind === "bohr") {
    ctx.strokeStyle = "#fbbf24";
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    label(ctx, "nucleus", cx - 36, cy + 52, "#fbbf24");
    const shells = [{ r: 100, n: 2, name: "K (n=1)" }, { r: 170, n: 8, name: "L (n=2)" }, { r: 240, n: 8, name: "M (n=3)" }];
    shells.forEach((s, si) => {
      ctx.strokeStyle = "rgba(34,211,238,0.6)";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, s.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 8;
      for (let i = 0; i < s.n; i++) {
        const a = (i / s.n) * Math.PI * 2 + si * 0.4;
        ctx.beginPath(); ctx.arc(cx + s.r * Math.cos(a), cy + s.r * Math.sin(a), 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      label(ctx, `${s.name}: ${s.n} e⁻`, cx + s.r * 0.72 + 6, cy - s.r * 0.72, "#f8fafc");
    });
    label(ctx, "Argon: 2, 8, 8", cx - 80, BOARD_H - 24, "#4ade80");
  }
  ctx.restore();
}

export function renderBoard(ctx: CanvasRenderingContext2D, ops: BoardOp[]) {
  ctx.save();
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  ctx.restore();
  for (const op of ops) {
    if (op.type === "stroke") drawStroke(ctx, op);
    else drawStamp(ctx, op.kind);
  }
}

export function appendSegment(ctx: CanvasRenderingContext2D, s: StrokeOp) {
  // Incremental draw of the latest stroke while the pointer moves.
  drawStroke(ctx, s);
}

export const STAMPS: { kind: StampKind; label: string }[] = [
  { kind: "grid", label: "Cartesian grid" },
  { kind: "parabola", label: "Quadratic parabola" },
  { kind: "circle", label: "Unit circle" },
  { kind: "bohr", label: "Bohr atom" },
];
