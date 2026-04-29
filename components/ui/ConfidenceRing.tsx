export function ConfidenceRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct >= 80 ? "#22c55e" : pct >= 65 ? "#f59e0b" : "#ef4444";
  const cx = size / 2, cy = size / 2;

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={size * 0.2} fontWeight={700}
        fill={color} fontFamily="JetBrains Mono, monospace">
        {pct}%
      </text>
    </svg>
  );
}
