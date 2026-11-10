import type { DiagramKind } from "../lib/deck";

const C = { axis: "#64748b", line: "#fbbf24", alt: "#22d3ee", text: "#cbd5e1" };

export function Diagram({ kind }: { kind: DiagramKind }) {
  if (kind === "none") return null;
  const common = { viewBox: "0 0 200 200", className: "h-full w-full", role: "img" } as const;
  switch (kind) {
    case "cartesian":
      return (
        <svg {...common} aria-label="Cartesian coordinate grid with a line">
          {Array.from({ length: 9 }, (_, i) => <g key={i}><line x1={20 * (i + 1)} y1="10" x2={20 * (i + 1)} y2="190" stroke="#1e293b" /><line x1="10" y1={20 * (i + 1)} x2="190" y2={20 * (i + 1)} stroke="#1e293b" /></g>)}
          <line x1="100" y1="8" x2="100" y2="192" stroke={C.axis} strokeWidth="1.5" /><line x1="8" y1="100" x2="192" y2="100" stroke={C.axis} strokeWidth="1.5" />
          <line x1="40" y1="160" x2="170" y2="40" stroke={C.line} strokeWidth="2.5" /><circle cx="100" cy="100" r="3" fill={C.alt} />
          <text x="182" y="94" fill={C.text} fontSize="9">x</text><text x="104" y="16" fill={C.text} fontSize="9">y</text>
        </svg>
      );
    case "parabola":
      return (
        <svg {...common} aria-label="Parabola opening upward with its turning point">
          <line x1="100" y1="8" x2="100" y2="192" stroke={C.axis} /><line x1="8" y1="150" x2="192" y2="150" stroke={C.axis} />
          <path d="M 30 20 Q 100 280 170 20" fill="none" stroke={C.line} strokeWidth="2.5" />
          <circle cx="100" cy="150" r="3.5" fill={C.alt} /><text x="106" y="144" fill={C.text} fontSize="9">turning point</text>
        </svg>
      );
    case "unit-circle":
      return (
        <svg {...common} aria-label="Unit circle with a 45 degree angle">
          <line x1="100" y1="8" x2="100" y2="192" stroke={C.axis} /><line x1="8" y1="100" x2="192" y2="100" stroke={C.axis} />
          <circle cx="100" cy="100" r="70" fill="none" stroke={C.line} strokeWidth="2" />
          <line x1="100" y1="100" x2="150" y2="50" stroke={C.alt} strokeWidth="2.5" /><line x1="150" y1="50" x2="150" y2="100" stroke={C.text} strokeDasharray="3 3" />
          <path d="M 125 100 A 25 25 0 0 0 118 82" fill="none" stroke={C.alt} /><text x="128" y="92" fill={C.text} fontSize="9">θ</text>
        </svg>
      );
    case "bohr":
      return (
        <svg {...common} aria-label="Bohr model with nucleus and electron shells">
          <circle cx="100" cy="100" r="14" fill={C.line} /><text x="93" y="104" fill="#0f172a" fontSize="9" fontWeight="700">N</text>
          {[34, 56, 78].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={C.axis} />)}
          {[[134, 100], [66, 100], [100, 44], [100, 156], [155, 100], [45, 100], [100, 22]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={C.alt} />)}
        </svg>
      );
    case "right-triangle":
      return (
        <svg {...common} aria-label="Right-angled triangle">
          <polygon points="40,160 160,160 40,50" fill="rgba(251,191,36,.12)" stroke={C.line} strokeWidth="2.5" />
          <polyline points="40,146 54,146 54,160" fill="none" stroke={C.alt} />
          <text x="90" y="176" fill={C.text} fontSize="10">adjacent</text><text x="12" y="108" fill={C.text} fontSize="10">opp</text><text x="104" y="96" fill={C.text} fontSize="10">hyp</text>
        </svg>
      );
    case "number-line":
      return (
        <svg {...common} aria-label="Number line from minus five to five">
          <line x1="10" y1="100" x2="190" y2="100" stroke={C.axis} strokeWidth="2" />
          {Array.from({ length: 11 }, (_, i) => <g key={i}><line x1={20 + i * 16} y1="94" x2={20 + i * 16} y2="106" stroke={C.axis} /><text x={16 + i * 16} y="122" fill={C.text} fontSize="8">{i - 5}</text></g>)}
          <circle cx={20 + 8 * 16} cy="100" r="5" fill={C.line} />
        </svg>
      );
  }
}
