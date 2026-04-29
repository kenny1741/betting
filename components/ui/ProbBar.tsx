import type { PickType } from "@/types";

interface Props {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  pick: PickType;
  homeName: string;
  awayName: string;
}

export function ProbBar({ homeWinPct, drawPct, awayWinPct, pick, homeName, awayName }: Props) {
  const isHome = pick === "HOME";
  const isDraw = pick === "DRAW";
  const isAway = pick === "AWAY";

  const shortHome = homeName.split(" ").slice(-1)[0] ?? homeName;
  const shortAway = awayName.split(" ").slice(-1)[0] ?? awayName;

  return (
    <div>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono, monospace", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <span>{shortHome}</span>
        <span>Draw</span>
        <span>{shortAway}</span>
      </div>
      {/* Bar */}
      <div style={{ display: "flex", height: 7, borderRadius: 99, overflow: "hidden", gap: 2, background: "rgba(255,255,255,0.04)" }}>
        <div style={{ width: `${homeWinPct}%`, background: isHome ? "var(--green)" : "rgba(34,197,94,0.22)", borderRadius: "99px 0 0 99px", transition: "width 0.7s" }} />
        <div style={{ width: `${drawPct}%`, background: isDraw ? "var(--amber)" : "rgba(245,158,11,0.22)", transition: "width 0.7s" }} />
        <div style={{ width: `${awayWinPct}%`, background: isAway ? "var(--red)" : "rgba(239,68,68,0.22)", borderRadius: "0 99px 99px 0", transition: "width 0.7s" }} />
      </div>
      {/* Percentages */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
        <span style={{ color: isHome ? "var(--green)" : "rgba(255,255,255,0.3)", fontWeight: isHome ? 700 : 400 }}>{homeWinPct}%</span>
        <span style={{ color: isDraw ? "var(--amber)" : "rgba(255,255,255,0.3)", fontWeight: isDraw ? 700 : 400 }}>{drawPct}%</span>
        <span style={{ color: isAway ? "var(--red)" : "rgba(255,255,255,0.3)", fontWeight: isAway ? 700 : 400 }}>{awayWinPct}%</span>
      </div>
    </div>
  );
}
