"use client";
import { useEffect, useState } from "react";
import type { Match } from "@/types";

const OUTCOME_LABEL: Record<string, string> = { HOME: "Home Win", DRAW: "Draw", AWAY: "Away Win" };
const OUTCOME_COLOR: Record<string, string> = { HOME: "var(--green)", DRAW: "var(--amber)", AWAY: "var(--red)" };

function ConfidenceRing({ pct }: { pct: number }) {
  const r = 20, circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct >= 65 ? "var(--green)" : pct >= 55 ? "var(--amber)" : "var(--red)";
  return (
    <svg width={54} height={54} style={{ flexShrink: 0 }}>
      <circle cx={27} cy={27} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <circle cx={27} cy={27} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 27 27)" />
      <text x={27} y={32} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}
        fontFamily="JetBrains Mono, monospace">{pct}%</text>
    </svg>
  );
}

export function BetOfDay() {
  const [picks, setPicks] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/betofday")
      .then(r => r.json())
      .then(d => setPicks(d.picks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && picks.length === 0) return null;

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.2rem" }}>🔥</span>
        <span style={{ fontFamily: "Bebas Neue", fontSize: "1.3rem", letterSpacing: "0.1em", color: "var(--amber)" }}>BET OF THE DAY</span>
        <span style={{ fontSize: "0.7rem", color: "var(--muted)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 4, padding: "2px 6px" }}>TOP 3 PICKS</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
        {loading
          ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)
          : picks.map((m, i) => (
            <div key={m.id} style={{
              background: "linear-gradient(135deg, #1a2236 0%, #131929 100%)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 12,
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              boxShadow: "0 4px 20px rgba(245,158,11,0.06)",
            }}>
              <div style={{ background: "rgba(245,158,11,0.1)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "Bebas Neue", color: "var(--amber)", fontSize: "1rem" }}>#{i+1}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.2rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.leagueName}
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", marginBottom: "0.3rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.homeTeam.name} vs {m.awayTeam.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: OUTCOME_COLOR[m.prediction.pick], background: `${OUTCOME_COLOR[m.prediction.pick]}15`, border: `1px solid ${OUTCOME_COLOR[m.prediction.pick]}30`, borderRadius: 4, padding: "2px 7px" }}>
                    {OUTCOME_LABEL[m.prediction.pick]}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                    {new Date(m.kickoff).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} UTC
                  </span>
                </div>
              </div>
              <ConfidenceRing pct={m.prediction.confidence} />
            </div>
          ))}
      </div>
    </div>
  );
}