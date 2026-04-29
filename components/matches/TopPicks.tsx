"use client";
import { useEffect, useState } from "react";
import type { Match, PickType } from "@/types";
import { ConfidenceRing } from "@/components/ui/ConfidenceRing";

const PICK_LABELS: Record<PickType, string> = {
  HOME: "Home Win", DRAW: "Draw", AWAY: "Away Win",
  BTTS_YES: "Both Teams Score", OVER25: "Over 2.5 Goals", OVER15: "Over 1.5 Goals",
};
const PICK_COLORS: Record<PickType, string> = {
  HOME: "#22c55e", DRAW: "#f59e0b", AWAY: "#ef4444",
  BTTS_YES: "#a78bfa", OVER25: "#60a5fa", OVER15: "#38bdf8",
};

export function TopPicks() {
  const [picks, setPicks] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/picks")
      .then(r => r.json())
      .then(d => setPicks(d.picks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && picks.length === 0) return null;

  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.4rem" }}>🔥</span>
        <span style={{ fontFamily: "Bebas Neue", fontSize: "1.4rem", letterSpacing: "0.1em", color: "#f59e0b" }}>
          BET OF THE DAY
        </span>
        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 5, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
          80%+ CONFIDENCE
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
        {loading
          ? [1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />
            ))
          : picks.map((m, i) => {
              const col = PICK_COLORS[m.prediction.pick];
              const kickoffTime = new Date(m.kickoff).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={m.id} style={{
                  background: `linear-gradient(135deg, rgba(245,158,11,0.05) 0%, var(--card) 100%)`,
                  border: "1px solid rgba(245,158,11,0.18)",
                  borderRadius: 13,
                  padding: "1rem 1rem 1rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  boxShadow: "0 4px 20px rgba(245,158,11,0.05)",
                }}>
                  {/* Rank */}
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "Bebas Neue", color: "#f59e0b", fontSize: "1.1rem" }}>#{i + 1}</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      {m.leagueName} · {kickoffTime}
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.homeTeam.name} vs {m.awayTeam.name}
                    </div>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700,
                      color: col,
                      background: `${col}14`,
                      border: `1px solid ${col}30`,
                      borderRadius: 5, padding: "2px 8px",
                    }}>
                      {PICK_LABELS[m.prediction.pick]}
                    </span>
                  </div>

                  {/* Confidence ring */}
                  <ConfidenceRing pct={m.prediction.confidence} size={52} />
                </div>
              );
            })}
      </div>
    </div>
  );
}
