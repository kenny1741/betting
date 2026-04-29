import { TopPicks } from "@/components/matches/TopPicks";
import { MatchDashboard } from "@/components/matches/MatchDashboard";
import { StadiumHero } from "@/components/layout/StadiumHero";

export default function HomePage() {
  return (
    <>
      {/* Stadium background — fixed, behind everything */}
      <StadiumHero />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.25rem 4rem", position: "relative", zIndex: 1 }}>

        {/* ── Hero section — sits on top of the stadium SVG ── */}
        <div style={{
          minHeight: 280,
          display: "flex", flexDirection: "column",
          justifyContent: "flex-end",
          paddingTop: 80,
          paddingBottom: 36,
        }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
            <div style={{ height: 1, width: 32, background: "rgba(34,197,94,0.5)" }} />
            <span style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "0.65rem", textTransform: "uppercase",
              letterSpacing: "0.28em", color: "rgba(34,197,94,0.7)",
            }}>
              Football Prediction Dashboard
            </span>
            <div style={{ height: 1, width: 32, background: "rgba(34,197,94,0.5)" }} />
          </div>

          {/* Main heading */}
          <h1 style={{
            fontFamily: "Bebas Neue",
            fontSize: "clamp(3rem, 9vw, 5.5rem)",
            lineHeight: 0.95,
            color: "white",
            letterSpacing: "0.02em",
            marginBottom: "1rem",
            textShadow: "0 4px 40px rgba(0,0,0,0.8)",
          }}>
            PREDICTIONS &amp;{" "}
            <span style={{
              color: "#22c55e",
              textShadow: "0 0 40px rgba(34,197,94,0.4), 0 4px 40px rgba(0,0,0,0.8)",
            }}>
              LIVE SCORES
            </span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.45)",
            maxWidth: 460,
            lineHeight: 1.65,
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}>
            Real-time predictions across{" "}
            <span style={{ color: "rgba(255,255,255,0.7)" }}>59 leagues</span>{" "}
            — Europe, Africa, Asia, and the Americas. Powered by live data and a multi-factor engine.
          </p>

          {/* Quick stats pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.25rem" }}>
            {[
              { icon: "🌍", label: "10 FDO Leagues" },
              { icon: "⚡", label: "49 RapidAPI Leagues" },
              { icon: "🔴", label: "Live Scores" },
              { icon: "🧠", label: "AI Predictions" },
            ].map(p => (
              <span key={p.label} style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                fontSize: "0.75rem", color: "rgba(255,255,255,0.55)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 99, padding: "4px 12px",
                backdropFilter: "blur(8px)",
              }}>
                {p.icon} {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Top Picks ── */}
        <TopPicks />

        {/* ── Match Dashboard ── */}
        <MatchDashboard />
      </div>
    </>
  );
}





/*import { TopPicks } from "@/components/matches/TopPicks";
import { MatchDashboard } from "@/components/matches/MatchDashboard";

export default function HomePage() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "5.5rem 1.25rem 4rem" }}>
      {/* Hero /}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(34,197,94,0.55)", marginBottom: "0.65rem" }}>
          Football Prediction Dashboard
        </p>
        <h1 style={{ fontFamily: "Bebas Neue", fontSize: "clamp(2.8rem, 8vw, 5rem)", lineHeight: 1, color: "white", letterSpacing: "0.02em", marginBottom: "0.75rem" }}>
          PREDICTIONS &amp; <span style={{ color: "var(--green)" }}>LIVE SCORES</span>
        </h1>
        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.38)", maxWidth: 480, lineHeight: 1.6 }}>
          Premier League · La Liga · Serie A — powered by real-time data.
        </p>
      </div>

      {/* Top Picks /}
      <TopPicks />

      {/* Match Dashboard /}
      <MatchDashboard />
    </div>
  );
}
*/

