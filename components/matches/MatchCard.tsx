"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { Match, PickType } from "@/types";
import { FormDots } from "@/components/ui/FormDots";
import { ConfidenceRing } from "@/components/ui/ConfidenceRing";

const PICK_LABELS: Record<PickType, string> = {
  HOME:     "Home Win",
  DRAW:     "Draw",
  AWAY:     "Away Win",
  BTTS_YES: "Both Teams Score",
  OVER25:   "Over 2.5 Goals",
  OVER15:   "Over 1.5 Goals",
};
const PICK_GREEN = "#22c55e";

function isLive(s: string)     { return ["LIVE","1H","HT","2H","ET","P"].includes(s); }
function isFinished(s: string) { return ["FT","AET","PEN"].includes(s); }

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// ── Zoom-toward-user hook ─────────────────────────────────────────────────────
function useCardFocus(isLiveMatch: boolean, onPeakFocus: () => void) {
  const wrapperRef      = useRef<HTMLDivElement>(null);
  const cardRef         = useRef<HTMLDivElement>(null);
  const hasEnteredRef   = useRef(false);
  const peakFiredRef    = useRef(false);
  const lastRatioRef    = useRef(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const card    = cardRef.current;
    if (!wrapper || !card) return;

    if (!hasEnteredRef.current) {
      wrapper.style.opacity    = "0";
      wrapper.style.transform  = "translateY(28px)";
    }
    wrapper.style.transition = "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1)";

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !hasEnteredRef.current) {
            hasEnteredRef.current = true;
            wrapper.style.opacity   = "1";
            wrapper.style.transform = "translateY(0)";
          } else if (!e.isIntersecting && !hasEnteredRef.current) {
            const above = e.boundingClientRect.top < 0;
            wrapper.style.opacity   = "0";
            wrapper.style.transform = above ? "translateY(-14px)" : "translateY(28px)";
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
    );
    io.observe(wrapper);

    const SCALE_ACTIVE    = 1.06;
    const SCALE_INACTIVE  = 0.92;
    const BRIGHT_ACTIVE   = 1.0;
    const BRIGHT_INACTIVE = 0.54;
    const MARGIN_ACTIVE   = 18;
    const MARGIN_BASE     = 0;

    const glowRGB       = isLiveMatch ? "239,68,68" : "34,197,94";
    const defaultShadow = isLiveMatch
      ? "0 4px 24px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

    card.style.transition =
      "transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1), " +
      "box-shadow 0.28s ease, " +
      "filter 0.28s ease";
    wrapper.style.transition += ", margin 0.28s ease";

    const applyRatio = (ratio: number) => {
      lastRatioRef.current = ratio;

      const scale      = SCALE_INACTIVE + ratio * (SCALE_ACTIVE - SCALE_INACTIVE);
      const brightness = BRIGHT_INACTIVE + ratio * (BRIGHT_ACTIVE - BRIGHT_INACTIVE);
      const margin     = MARGIN_BASE + ratio * MARGIN_ACTIVE;

      card.style.transform = `scale(${scale.toFixed(4)})`;
      card.style.filter    = `brightness(${brightness.toFixed(3)})`;
      wrapper.style.marginTop    = `${margin.toFixed(1)}px`;
      wrapper.style.marginBottom = `${margin.toFixed(1)}px`;

      if (ratio > 0.5) {
        const t          = (ratio - 0.5) / 0.5;
        const glowAlpha  = (t * 0.28).toFixed(3);
        const glowSpread = (t * 16).toFixed(0);
        const yOff       = Math.round(8 + ratio * 28);
        const blur       = Math.round(24 + ratio * 44);
        const darkAlpha  = (0.3 + ratio * 0.35).toFixed(2);
        card.style.boxShadow =
          `0 ${yOff}px ${blur}px rgba(0,0,0,${darkAlpha}), ` +
          `0 0 ${glowSpread}px rgba(${glowRGB},${glowAlpha}), ` +
          `0 0 0 1px rgba(${glowRGB},${(t * 0.5).toFixed(3)}), ` +
          `inset 0 1px 0 rgba(255,255,255,0.08)`;
      } else {
        card.style.boxShadow = defaultShadow;
      }

      if (ratio > 0.72 && !peakFiredRef.current) {
        peakFiredRef.current = true;
        onPeakFocus();
      }
    };

    const onScroll = () => {
      if (!hasEnteredRef.current) return;
      const rect    = wrapper.getBoundingClientRect();
      const vh      = window.innerHeight;
      const cardMid = rect.top + rect.height / 2;
      const dist    = Math.abs(cardMid - vh / 2);
      const maxDist = vh * 0.60;
      const raw     = Math.max(0, 1 - dist / maxDist);
      applyRatio(smoothstep(raw));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    requestAnimationFrame(() => setTimeout(onScroll, 0));

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [isLiveMatch, onPeakFocus]);

  return { wrapperRef, cardRef };
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ src, name }: { src: string; name: string }) {
  const size = 28;
  if (!src) return (
    <div style={{ width: size, height: size, borderRadius: 7, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", flexShrink: 0, fontFamily: "JetBrains Mono, monospace" }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <Image src={src} alt={name} fill style={{ objectFit: "contain" }} unoptimized />
    </div>
  );
}

// ── Insight row ───────────────────────────────────────────────────────────────
function InsightRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color = positive === true ? "#22c55e" : positive === false ? "#ef4444" : "#f59e0b";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</span>
    </div>
  );
}

// ── Animated percentage number (expanded win-prob tiles) ──────────────────────
// Animates on mount — component only exists while panel is open so no
// trigger/hasRun guard is needed. mountDelay staggers the three tiles:
// HOME=0ms → AWAY=1280ms → DRAW=2560ms
function AnimatedPct({
  target,
  color,
  active,
  mountDelay = 0,
}: {
  target: number;
  color: string;
  active: boolean;
  mountDelay?: number;
}) {
  const [val, setVal] = useState(0);
  const rafRef  = useRef<number>(0);
  
  //const timer   = useRef<ReturnType<typeof setTimeout>>();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const DURATION = 1100;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const t      = Math.min((now - startTime) / DURATION, 1);
      const eased  = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    timer.current = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, mountDelay);

    return () => {
  if (timer.current) clearTimeout(timer.current);
  cancelAnimationFrame(rafRef.current);
};
  }, []); // empty — run once on mount

  return (
    <span style={{ fontFamily: "Bebas Neue", fontSize: 24, color: active ? color : "rgba(255,255,255,0.35)", lineHeight: 1 }}>
      {val}%
    </span>
  );
}

// ── Animated probability bar ──────────────────────────────────────────────────
// Sequential order: HOME → AWAY → DRAW
// Draw bar pops from the center outward using scaleX(0 → 1).
function ProbBar({
  homeWinPct,
  drawPct,
  awayWinPct,
  pick,
  homeName,
  awayName,
  triggerAnimation,
}: {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  pick: PickType;
  homeName: string;
  awayName: string;
  triggerAnimation: boolean;
}) {
  // Bar fill widths (0 → target%)
  const [homeWidth, setHomeWidth] = useState(0);
  const [awayWidth, setAwayWidth] = useState(0);
  // Draw uses scaleX (0 → 1) for the pop-from-center effect
  const [drawScale, setDrawScale] = useState(0);

  // Numbers shown beneath the bars
  const [homeNum, setHomeNum] = useState(0);
  const [awayNum, setAwayNum] = useState(0);
  const [drawNum, setDrawNum] = useState(0);

  const hasAnimated = useRef(false);
  const rafRef      = useRef<number>(0);

  useEffect(() => {
    if (!triggerAnimation || hasAnimated.current) return;
    hasAnimated.current = true;

    const DURATION = 1200; // ms per bar
    const GAP      = 80;   // pause between phases

    const runPhase = (
      delay: number,
      target: number,
      setFill: (v: number) => void,
      setNum: (v: number) => void,
      isScale = false,
    ) => {
      let startTime: number | null = null;

      const tick = (now: number) => {
        if (startTime === null) startTime = now;
        const t      = Math.min((now - startTime) / DURATION, 1);
        const eased  = 1 - Math.pow(1 - t, 3);
        // isScale: setFill receives 0-1; otherwise receives 0-target%
        setFill(isScale ? eased : eased * target);
        setNum(Math.round(eased * target));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };

      setTimeout(() => {
        rafRef.current = requestAnimationFrame(tick);
      }, delay);
    };

    // Phase 1 — Home   (starts immediately)
    runPhase(0,                    homeWinPct, setHomeWidth, setHomeNum);
    // Phase 2 — Away   (starts after Home finishes)
    runPhase(DURATION + GAP,       awayWinPct, setAwayWidth, setAwayNum);
    // Phase 3 — Draw   (starts after Away finishes, uses scaleX pop)
    runPhase(2 * (DURATION + GAP), drawPct,    setDrawScale, setDrawNum, true);

    return () => cancelAnimationFrame(rafRef.current);
  }, [triggerAnimation, homeWinPct, awayWinPct, drawPct]);

  const shortHome = homeName.length > 13 ? homeName.split(" ")[0] : homeName;
  const shortAway = awayName.length > 13 ? awayName.split(" ")[0] : awayName;

  const homeIsWinner = homeWinPct >= awayWinPct && homeWinPct >= drawPct;
  const awayIsWinner = awayWinPct > homeWinPct  && awayWinPct >= drawPct;

  const homeColor = homeIsWinner ? "#22c55e" : "#ef4444";
  const awayColor = awayIsWinner ? "#22c55e" : "#ef4444";
  const homeGlow  = homeIsWinner ? "rgba(34,197,94,0.55)"  : "rgba(239,68,68,0.45)";
  const awayGlow  = awayIsWinner ? "rgba(34,197,94,0.55)"  : "rgba(239,68,68,0.45)";

  const homeBg = homeIsWinner
    ? "linear-gradient(90deg,#22c55e 0%,#16a34a 100%)"
    : "linear-gradient(90deg,#ef4444 0%,#b91c1c 100%)";
  const awayBg = awayIsWinner
    ? "linear-gradient(90deg,#16a34a 0%,#22c55e 100%)"
    : "linear-gradient(90deg,#b91c1c 0%,#ef4444 100%)";
  const drawBg = "linear-gradient(90deg,#f59e0b 0%,#d97706 100%)";

  return (
    <div>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "JetBrains Mono, monospace" }}>
        <span style={{ color: homeColor }}>{shortHome}</span>
        <span style={{ color: "#f59e0b" }}>Draw</span>
        <span style={{ color: awayColor }}>{shortAway}</span>
      </div>

      {/* Bar track */}
      <div style={{ display: "flex", gap: 3, height: 8, borderRadius: 99, overflow: "hidden" }}>

        {/* HOME — fills left → right */}
        <div style={{
          width: `${homeWinPct}%`, height: "100%", borderRadius: 99,
          overflow: "hidden", position: "relative",
          minWidth: homeWinPct > 0 ? 4 : 0,
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: `${homeWinPct > 0 ? (homeWidth / homeWinPct) * 100 : 0}%`,
            height: "100%", borderRadius: 99,
            background: homeBg,
            boxShadow: homeWidth > 0 ? `0 0 10px ${homeGlow}` : "none",
          }} />
        </div>

        {/* DRAW — pops from center via scaleX */}
        <div style={{
          width: `${drawPct}%`, height: "100%", borderRadius: 99,
          overflow: "hidden", position: "relative",
          minWidth: drawPct > 0 ? 4 : 0,
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            borderRadius: 99,
            background: drawBg,
            boxShadow: drawScale > 0.05 ? "0 0 10px rgba(245,158,11,0.55)" : "none",
            transform: `scaleX(${drawScale.toFixed(4)})`,
            transformOrigin: "center center",
          }} />
        </div>

        {/* AWAY — fills right → left */}
        <div style={{
          width: `${awayWinPct}%`, height: "100%", borderRadius: 99,
          overflow: "hidden", position: "relative",
          minWidth: awayWinPct > 0 ? 4 : 0,
        }}>
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: `${awayWinPct > 0 ? (awayWidth / awayWinPct) * 100 : 0}%`,
            height: "100%", borderRadius: 99,
            background: awayBg,
            boxShadow: awayWidth > 0 ? `0 0 10px ${awayGlow}` : "none",
          }} />
        </div>
      </div>

      {/* Numbers beneath bars */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
        <span style={{ color: homeColor, fontWeight: homeIsWinner ? 700 : 400 }}>{homeNum}%</span>
        <span style={{ color: "#f59e0b", fontWeight: 400 }}>{drawNum}%</span>
        <span style={{ color: awayColor, fontWeight: awayIsWinner ? 700 : 400 }}>{awayNum}%</span>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export function MatchCard({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const [barTrigger, setBarTrigger] = useState(false);
  const barTriggered = useRef(false);

  const { prediction: pred, homeTeam, awayTeam, homeScore, awayScore, status, minute, goals } = match;

  const live      = isLive(status);
  const finished  = isFinished(status);
  const showScore = live || finished;

  const onPeakFocus = useRef(() => {
    if (!barTriggered.current) {
      barTriggered.current = true;
      setBarTrigger(true);
    }
  }).current;

  const { wrapperRef, cardRef } = useCardFocus(live, onPeakFocus);

  const homeWin = showScore && homeScore !== null && awayScore !== null && homeScore > awayScore;
  const awayWin = showScore && homeScore !== null && awayScore !== null && awayScore > homeScore;

  const kickoffDate = new Date(match.kickoff);
  const timeStr = kickoffDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = kickoffDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const reasoning: string[] = Array.isArray(pred.reasoning)
    ? pred.reasoning
    : typeof pred.reasoning === "string"
      ? (() => { try { return JSON.parse(pred.reasoning as string); } catch { return [pred.reasoning as string]; } })()
      : [];

  return (
    <div ref={wrapperRef} style={{ willChange: "opacity, transform, margin" }}>
      <div
        ref={cardRef}
        style={{
          background: live
            ? "linear-gradient(135deg, rgba(239,68,68,0.11) 0%, #1a2438 100%)"
            : "linear-gradient(135deg, #1e2d44 0%, #162030 100%)",
          border: `0.5px solid ${live ? "rgba(239,68,68,0.28)" : "rgba(255,255,255,0.09)"}`,
          borderRadius: 15,
          overflow: "hidden",
          boxShadow: live
            ? "0 4px 24px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          cursor: "default",
          willChange: "transform, box-shadow, filter",
          transformOrigin: "center center",
        }}
      >
        <div style={{ padding: "12px 13px" }}>

          {/* Row 1: time + Our Pick */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              {live ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#ef4444", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
                  <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0 }} />
                  {status === "HT" ? "HT" : `${minute ?? ""}' LIVE`}
                </span>
              ) : finished ? (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono, monospace" }}>FT</span>
              ) : (
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.65)", fontFamily: "JetBrains Mono, monospace" }}>{timeStr}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}>{dateStr}</div>
                </div>
              )}
              {pred.isTopPick && (
                <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.13)", border: "1px solid rgba(245,158,11,0.28)", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                  Top Pick
                </span>
              )}
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.28)",
              borderRadius: 8, padding: "5px 10px",
              boxShadow: "0 2px 14px rgba(34,197,94,0.12), inset 0 1px 0 rgba(34,197,94,0.1)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Our Pick</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: PICK_GREEN }}>{PICK_LABELS[pred.pick]}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: PICK_GREEN, fontFamily: "JetBrains Mono, monospace" }}>{pred.confidence}%</span>
            </div>
          </div>

          {/* Row 2: Teams + score */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Logo src={homeTeam.logo} name={homeTeam.name} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: homeWin ? "#22c55e" : "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {homeTeam.name}
                </div>
                {homeTeam.position && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>#{homeTeam.position}</div>}
                <FormDots form={homeTeam.form} />
              </div>
            </div>

            <div style={{ textAlign: "center", flexShrink: 0, minWidth: 58 }}>
              {showScore ? (
                <div style={{ fontFamily: "Bebas Neue", fontSize: 28, letterSpacing: "0.04em", lineHeight: 1 }}>
                  <span style={{ color: homeWin ? "#22c55e" : awayWin ? "rgba(255,255,255,0.3)" : "#e2e8f0" }}>{homeScore ?? 0}</span>
                  <span style={{ color: "rgba(255,255,255,0.18)", margin: "0 5px" }}>–</span>
                  <span style={{ color: awayWin ? "#22c55e" : homeWin ? "rgba(255,255,255,0.3)" : "#e2e8f0" }}>{awayScore ?? 0}</span>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", fontFamily: "JetBrains Mono, monospace" }}>vs</span>
              )}
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexDirection: "row-reverse", minWidth: 0 }}>
              <Logo src={awayTeam.logo} name={awayTeam.name} />
              <div style={{ minWidth: 0, textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: awayWin ? "#22c55e" : "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {awayTeam.name}
                </div>
                {awayTeam.position && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>#{awayTeam.position}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <FormDots form={awayTeam.form} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Prob bar */}
          <ProbBar
            homeWinPct={pred.homeWinPct}
            drawPct={pred.drawPct}
            awayWinPct={pred.awayWinPct}
            pick={pred.pick}
            homeName={homeTeam.name}
            awayName={awayTeam.name}
            triggerAnimation={barTrigger}
          />

          {/* Goal events */}
          {live && goals.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "0.2rem 0.6rem" }}>
              {goals.map((g, i) => (
                <span key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "JetBrains Mono, monospace" }}>
                  ⚽ {g.scorer} {g.minute}&apos;
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: "100%", padding: "8px 13px",
            background: "rgba(255,255,255,0.025)",
            border: "none", borderTop: "0.5px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.35)", fontSize: 11,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 4, transition: "all 0.15s",
            fontFamily: "Inter, sans-serif",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
        >
          {open ? "▲ Hide Details" : "▼ More Details"}
        </button>

        {/* Expanded panel */}
        {open && (
          <div className="slide-up" style={{
            borderTop: "0.5px solid rgba(255,255,255,0.07)",
            padding: "1rem 13px",
            background: "rgba(0,0,0,0.22)",
            display: "flex", flexDirection: "column", gap: "1.1rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <ConfidenceRing pct={pred.confidence} size={60} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 3 }}>{pred.confidence}% Confidence</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  Prediction: <strong style={{ color: PICK_GREEN }}>{PICK_LABELS[pred.pick]}</strong>
                </div>
              </div>
            </div>

            {/* Win Probabilities tiles */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Win Probabilities</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {([
                  { label: homeTeam.name, pct: pred.homeWinPct, pick: "HOME" as PickType, color: "#22c55e", delay: 0 },
                  { label: "Draw",        pct: pred.drawPct,    pick: "DRAW" as PickType, color: "#f59e0b", delay: 2560 },
                  { label: awayTeam.name, pct: pred.awayWinPct, pick: "AWAY" as PickType, color: "#3b82f6", delay: 1280 },
                ] as { label: string; pct: number; pick: PickType; color: string; delay: number }[]).map(item => {
                  const active = pred.pick === item.pick;
                  return (
                    <div key={item.pick} style={{
                      background: active ? `${item.color}12` : "rgba(255,255,255,0.03)",
                      border: `0.5px solid ${active ? `${item.color}35` : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 10, padding: "9px 4px", textAlign: "center",
                      boxShadow: active ? `0 0 16px ${item.color}20` : "none",
                    }}>
                      {/* Key forces remount on every open so animation always replays */}
                      <AnimatedPct
                        key={`${item.pick}-${open}`}
                        target={item.pct}
                        color={item.color}
                        active={active}
                        mountDelay={item.delay}
                      />
                      <div style={{ fontSize: 9, color: active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.22)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>
                        {item.label.length > 11 ? item.label.split(" ")[0] : item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Season Stats */}
            {(homeTeam.played ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Season Stats</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "2px 0", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{homeTeam.name}</th>
                      <th style={{ textAlign: "center", padding: "2px 0", color: "rgba(255,255,255,0.22)", fontWeight: 400, fontSize: 10 }}>Stat</th>
                      <th style={{ textAlign: "right", padding: "2px 0", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{awayTeam.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Position",       h: homeTeam.position,     a: awayTeam.position,     lowerBetter: true },
                      { label: "Points",         h: homeTeam.points,       a: awayTeam.points },
                      { label: "Goals Scored",   h: homeTeam.goalsFor,     a: awayTeam.goalsFor },
                      { label: "Goals Conceded", h: homeTeam.goalsAgainst, a: awayTeam.goalsAgainst, lowerBetter: true },
                      { label: "Form",           h: homeTeam.form ?? "—",  a: awayTeam.form ?? "—" },
                    ].filter(r => r.h !== undefined && r.h !== null).map(row => {
                      const hNum = typeof row.h === "number" ? row.h : null;
                      const aNum = typeof row.a === "number" ? row.a : null;
                      const hBetter = hNum !== null && aNum !== null && (row.lowerBetter ? hNum < aNum : hNum > aNum);
                      const aBetter = hNum !== null && aNum !== null && (row.lowerBetter ? aNum < hNum : aNum > hNum);
                      return (
                        <tr key={row.label} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "5px 0", fontFamily: "JetBrains Mono, monospace", color: hBetter ? "#22c55e" : "rgba(255,255,255,0.55)", fontWeight: hBetter ? 700 : 400 }}>{row.h}</td>
                          <td style={{ padding: "5px 0", textAlign: "center", color: "rgba(255,255,255,0.22)", fontSize: 10 }}>{row.label}</td>
                          <td style={{ padding: "5px 0", textAlign: "right", fontFamily: "JetBrains Mono, monospace", color: aBetter ? "#22c55e" : "rgba(255,255,255,0.55)", fontWeight: aBetter ? 700 : 400 }}>{row.a}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Betting Insights */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Betting Insights</div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "0 11px" }}>
                <InsightRow label="Both Teams To Score" value={pred.bttsYesPct >= 50 ? `YES (${pred.bttsYesPct}%)` : `NO (${100 - pred.bttsYesPct}%)`} positive={pred.bttsYesPct >= 55} />
                <InsightRow label="Over 2.5 Goals"  value={`${pred.over25Pct}%`}        positive={pred.over25Pct >= 60} />
                <InsightRow label="Under 2.5 Goals" value={`${100 - pred.over25Pct}%`}  positive={(100 - pred.over25Pct) >= 55} />
                <InsightRow label="Over 1.5 Goals"  value={`${pred.over15Pct}%`}        positive={pred.over15Pct >= 70} />
                <InsightRow label="Under 1.5 Goals" value={`${100 - pred.over15Pct}%`}  positive={(100 - pred.over15Pct) >= 55} />
              </div>
            </div>

            {/* Market Odds */}
            {pred.oddsHome && pred.oddsDraw && pred.oddsAway && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>
                  Market Odds
                  {pred.marketAgreement != null && (
                    <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: pred.marketAgreement >= 75 ? "#22c55e" : pred.marketAgreement >= 55 ? "#f59e0b" : "#ef4444" }}>
                      {pred.marketAgreement >= 75 ? "Strong agreement" : pred.marketAgreement >= 55 ? "Moderate agreement" : "Low agreement"}
                    </span>
                  )}
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "0 11px" }}>
                  <InsightRow label={`${homeTeam.name} Win`} value={`${pred.oddsHome.toFixed(2)} → ${pred.oddsHomePct}%`} positive={pred.pick === "HOME"} />
                  <InsightRow label="Draw" value={`${pred.oddsDraw.toFixed(2)} → ${pred.oddsDrawPct}%`} positive={pred.pick === "DRAW"} />
                  <InsightRow label={`${awayTeam.name} Win`} value={`${pred.oddsAway.toFixed(2)} → ${pred.oddsAwayPct}%`} positive={pred.pick === "AWAY"} />
                </div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>Blended at 35% market / 65% model</p>
              </div>
            )}

            {/* Reasoning */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Why This Prediction</div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {reasoning.length > 0 ? reasoning.map((r, i) => (
                  <li key={i} style={{ display: "flex", gap: 7, fontSize: 12, color: "rgba(255,255,255,0.58)", lineHeight: 1.5 }}>
                    <span style={{ color: "#22c55e", flexShrink: 0, marginTop: 2 }}>›</span>
                    {String(r)}
                  </li>
                )) : (
                  <li style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>Re-sync this match to generate reasoning.</li>
                )}
              </ul>
            </div>

            {match.venue && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>📍 {match.venue}</p>}
          </div>
        )}
      </div>
    </div>
  );
}