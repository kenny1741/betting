"use client";
import { useState } from "react";
import { LEAGUES } from "@/lib/api-football";
import { RAPIDAPI_LEAGUES } from "@/lib/rapidapi-football";

type SyncType = "today" | "tomorrow" | "upcoming" | "live";

interface StepResult {
  league: string;
  source: "fdo" | "rapid";
  status: "pending" | "running" | "done" | "skipped" | "error";
  synced?: number;
  error?: string;
}

// Combined list — must match the order in sync.ts ALL_LEAGUES
const ALL_LEAGUES = [
  ...LEAGUES.map(l => ({ ...l, source: "fdo" as const })),
  ...RAPIDAPI_LEAGUES.map(l => ({ ...l, source: "rapid" as const })),
];

const SYNC_TYPES: { id: SyncType; label: string; desc: string; icon: string }[] = [
  { id: "today",    label: "Today",       icon: "📅", desc: "Sync today's fixtures for all leagues" },
  { id: "tomorrow", label: "Tomorrow",    icon: "🗓", desc: "Sync today + tomorrow's fixtures" },
  { id: "upcoming", label: "Upcoming",    icon: "🔮", desc: "Sync all fixtures for next 7 days" },
  { id: "live",     label: "Live Update", icon: "🔴", desc: "Refresh live scores and goal events (all leagues)" },
];

const s = {
  container: { maxWidth: 720, margin: "0 auto", padding: "5.5rem 1.25rem 4rem" } as React.CSSProperties,
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "0.75rem" } as React.CSSProperties,
  input: { width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "white", fontSize: "0.9rem", outline: "none", fontFamily: "JetBrains Mono, monospace" } as React.CSSProperties,
  btn: (disabled: boolean, color = "var(--green)"): React.CSSProperties => ({
    background: `${color}14`, border: `1px solid ${color}28`,
    borderRadius: 9, padding: "8px 20px",
    color, fontWeight: 600, fontSize: "0.85rem",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap",
    transition: "all 0.15s",
  }),
  tag: (color: string): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace",
    padding: "2px 8px", borderRadius: 4,
    background: `${color}14`, border: `1px solid ${color}28`, color,
  }),
};

export default function AdminPage() {
  const [secret, setSecret]   = useState("");
  const [steps, setSteps]     = useState<StepResult[]>([]);
  const [running, setRunning] = useState(false);
  const [activeType, setActiveType] = useState<SyncType | null>(null);

  function setStep(index: number, update: Partial<StepResult>) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
  }

  async function safeFetch(url: string): Promise<{ success: boolean; synced?: number; error?: string; league?: string }> {
    try {
      const res  = await fetch(url);
      const text = await res.text();
      if (!text || text.trim() === "") {
        return { success: false, error: "Empty response from server (possible timeout)" };
      }
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, error: `Bad JSON: ${text.slice(0, 120)}` };
      }
    } catch (e: any) {
      return { success: false, error: e?.message ?? "Network error" };
    }
  }

  async function runSyncAll(type: SyncType) {
    if (!secret.trim()) { alert("Enter your SYNC_SECRET first"); return; }
    if (running) return;

    setActiveType(type);
    setRunning(true);

    if (type === "live") {
      // Live is a single call covering ALL leagues (FDO + RapidAPI)
      setSteps([{ league: "All Leagues (FDO + RapidAPI)", source: "fdo", status: "running" }]);
      const result = await safeFetch(`/api/sync?secret=${encodeURIComponent(secret)}&type=live`);
      setSteps([{
        league: "All Leagues (FDO + RapidAPI)",
        source: "fdo",
        status: result.success ? "done" : "error",
        synced: result.synced,
        error:  result.error,
      }]);
      setRunning(false);
      setActiveType(null);
      return;
    }

    // Fixtures: one call per league (FDO + RapidAPI), sequentially
    const initialSteps: StepResult[] = ALL_LEAGUES.map(l => ({
      league: l.name,
      source: l.source,
      status: "pending",
    }));
    setSteps(initialSteps);

    for (let i = 0; i < ALL_LEAGUES.length; i++) {
      setStep(i, { status: "running" });
      const url    = `/api/sync?secret=${encodeURIComponent(secret)}&type=${type}&league=${i}`;
      const result = await safeFetch(url);

      if (result.success && (result as any).skipped) {
        setStep(i, { status: "skipped" });
      } else if (result.success) {
        setStep(i, { status: "done", synced: result.synced });
      } else {
        setStep(i, { status: "error", error: result.error });
      }

      // Pause between leagues — FDO needs more breathing room (rate-limit)
      const pause = ALL_LEAGUES[i].source === "fdo" ? 1200 : 600;
      if (i < ALL_LEAGUES.length - 1) await new Promise(r => setTimeout(r, pause));
    }

    setRunning(false);
    setActiveType(null);
  }

  const totalSynced = steps.filter(s => s.status === "done").reduce((sum, s) => sum + (s.synced ?? 0), 0);
  const hasError    = steps.some(s => s.status === "error");
  const allDone     = steps.length > 0 && steps.every(s => s.status === "done" || s.status === "error" || s.status === "skipped");
  const skippedCount = steps.filter(s => s.status === "skipped").length;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(245,158,11,0.55)", marginBottom: "0.5rem" }}>Admin Panel</p>
        <h1 style={{ fontFamily: "Bebas Neue", fontSize: "3rem", color: "white", letterSpacing: "0.04em" }}>
          SYNC <span style={{ color: "var(--amber)" }}>ENGINE</span>
        </h1>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)", marginTop: "0.4rem", lineHeight: 1.6 }}>
          Syncs one league at a time to avoid server timeouts.
          Covers {LEAGUES.length} FDO leagues + {RAPIDAPI_LEAGUES.length} RapidAPI leagues ({ALL_LEAGUES.length} total).
        </p>
      </div>

      {/* Secret input */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, fontFamily: "JetBrains Mono, monospace" }}>
          SYNC_SECRET (from .env.local)
        </label>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="Enter sync secret…"
          style={s.input}
          onFocus={e => (e.target.style.borderColor = "rgba(245,158,11,0.4)")}
          onBlur={e  => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Sync buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.5rem" }}>
        {SYNC_TYPES.map(t => (
          <div key={t.id} style={{ ...s.card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 3 }}>
                <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
                <span style={{ fontWeight: 600 }}>{t.label}</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>{t.desc}</div>
            </div>
            <button
              onClick={() => runSyncAll(t.id)}
              disabled={running}
              style={s.btn(running)}
            >
              {running && activeType === t.id ? "Running…" : "Run"}
            </button>
          </div>
        ))}
      </div>

      {/* Progress */}
      {steps.length > 0 && (
        <div style={{ ...s.card, marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              {running ? "⏳ Syncing…" : allDone ? (hasError ? "⚠️ Completed with errors" : "✅ All done!") : "Progress"}
            </span>
            {allDone && !running && (
              <div style={{ display: "flex", gap: 6 }}>
                <span style={s.tag(hasError ? "var(--amber)" : "var(--green)")}>
                  {totalSynced} records synced
                </span>
                {skippedCount > 0 && (
                  <span style={s.tag("rgba(255,255,255,0.25)")}>
                    {skippedCount} not subscribed
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {steps.map((step, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px",
                background: step.source === "rapid" ? "rgba(59,130,246,0.04)" : "rgba(34,197,94,0.03)",
                borderRadius: 8,
                border: `1px solid ${step.source === "rapid" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.05)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>
                    {step.status === "pending" ? "⏳"
                     : step.status === "running" ? "🔄"
                     : step.status === "done"    ? "✅"
                     : step.status === "skipped"  ? "⛔"
                     : "❌"}
                  </span>
                  <span style={{ fontSize: "0.875rem", color: step.status === "running" ? "white" : "rgba(255,255,255,0.6)" }}>
                    {step.league}
                  </span>
                  {/* Source badge */}
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: "JetBrains Mono, monospace",
                    padding: "1px 5px", borderRadius: 3,
                    background: step.source === "rapid" ? "rgba(59,130,246,0.15)" : "rgba(34,197,94,0.12)",
                    color: step.source === "rapid" ? "#60a5fa" : "#4ade80",
                  }}>
                    {step.source === "rapid" ? "RAPID" : "FDO"}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                  {step.status === "running" && (
                    <span style={{ color: "var(--amber)" }}>syncing…</span>
                  )}
                  {step.status === "done" && (
                    <span style={{ color: "var(--green)" }}>{step.synced ?? 0} records</span>
                  )}
                  {step.status === "skipped" && (
                    <span style={{ color: "rgba(255,255,255,0.25)" }}>not subscribed</span>
                  )}
                  {step.status === "error" && (
                    <span style={{ color: "var(--red)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {step.error ?? "Error"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leagues info */}
      <div style={{ ...s.card, marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Configured Leagues ({ALL_LEAGUES.length} total)
        </div>

        {/* FDO leagues */}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          football-data.org ({LEAGUES.length} leagues) — indices 0–{LEAGUES.length - 1}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
          {LEAGUES.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8rem", padding: "4px 8px", background: "rgba(34,197,94,0.04)", borderRadius: 6, border: "0.5px solid rgba(34,197,94,0.1)" }}>
              {l.logo && <img src={l.logo} alt="" width={16} height={16} style={{ objectFit: "contain", flexShrink: 0 }} />}
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(34,197,94,0.45)", width: 20 }}>{i}</span>
              <span style={{ color: "rgba(255,255,255,0.7)" }}>{l.name}</span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>{l.country}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "rgba(34,197,94,0.4)" }}>FDO · Season {l.season}</span>
            </div>
          ))}
        </div>

        {/* RapidAPI leagues */}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          API-Football / RapidAPI ({RAPIDAPI_LEAGUES.length} leagues) — indices {LEAGUES.length}–{ALL_LEAGUES.length - 1}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {RAPIDAPI_LEAGUES.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8rem", padding: "4px 8px", background: "rgba(59,130,246,0.04)", borderRadius: 6, border: "0.5px solid rgba(59,130,246,0.1)" }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(59,130,246,0.45)", width: 20 }}>{LEAGUES.length + i}</span>
              <span style={{ color: "rgba(255,255,255,0.7)" }}>{l.name}</span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>{l.country}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "rgba(59,130,246,0.4)" }}>RAPID · ID {l.apiId} · {l.season}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Automation tip */}
      <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "1.25rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#60a5fa", marginBottom: "0.75rem" }}>⚙️ Automate with Vercel Cron</div>
        <pre style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "0.75rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", overflow: "auto", lineHeight: 1.6 }}>{`// vercel.json
{
  "crons": [
    // FDO leagues (0-${LEAGUES.length - 1}) — stagger by 5 min
    ${LEAGUES.map((l, i) => `{ "path": "/api/sync?secret=SECRET&type=today&league=${i}", "schedule": "${i * 5} 6 * * *" }`).join(",\n    ")},

    // RapidAPI leagues (${LEAGUES.length}-${ALL_LEAGUES.length - 1}) — stagger by 3 min
    ${RAPIDAPI_LEAGUES.map((l, i) => `{ "path": "/api/sync?secret=SECRET&type=today&league=${LEAGUES.length + i}", "schedule": "${i * 3} 7 * * *" }`).join(",\n    ")},

    // Live updates every 2 min (covers all leagues in one call)
    { "path": "/api/sync?secret=SECRET&type=live", "schedule": "*/2 * * * *" }
  ]
}`}</pre>
      </div>
    </div>
  );
}
