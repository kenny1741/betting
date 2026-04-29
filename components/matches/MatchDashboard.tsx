"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Match } from "@/types";
import { MatchCard } from "./MatchCard";

type Tab = "today" | "tomorrow" | "upcoming" | "live";

const TABS = [
  { id: "today"    as Tab, emoji: "📅", label: "Today"    },
  { id: "tomorrow" as Tab, emoji: "🗓", label: "Tomorrow" },
  { id: "upcoming" as Tab, emoji: "🔮", label: "Upcoming" },
  { id: "live"     as Tab, emoji: "🔴", label: "Live"     },
];

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 140, borderRadius: 13 }} />
      ))}
    </div>
  );
}

function NoData({ tab, synced }: { tab: Tab; synced: string | null }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "2.5rem 2rem", textAlign: "center",
    }}>
      {tab === "live" ? (
        <>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📡</div>
          <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "0.4rem" }}>No live matches right now</div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.25)" }}>Check back during match hours</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div>
          <div style={{ fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>No match data yet</div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>
            The system needs to sync data first.<br />
            Run the sync to fetch today&apos;s matches from the API.
          </div>
          <a href="/admin" style={{
            display: "inline-block", marginTop: "1rem",
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
            color: "var(--green)", borderRadius: 8, padding: "8px 18px",
            fontSize: "0.85rem", textDecoration: "none", fontWeight: 600,
          }}>
            → Go to Admin / Sync
          </a>
        </>
      )}
      {synced && (
        <div style={{ marginTop: "1rem", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono, monospace" }}>
          Last sync: {new Date(synced).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function LeagueSection({ leagueName, leagueLogo, matches }: { leagueName: string; leagueLogo: string; matches: Match[] }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 2px" }}>
        {leagueLogo && (
          <img src={leagueLogo} alt={leagueName} width={20} height={20} style={{ objectFit: "contain" }} />
        )}
        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "rgba(255,255,255,0.8)" }}>{leagueName}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono, monospace" }}>
          {matches.length} match{matches.length !== 1 ? "es" : ""}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {matches.map(m => <MatchCard key={m.id} match={m} />)}
      </div>
    </div>
  );
}

export function MatchDashboard({ defaultTab = "today" }: { defaultTab?: Tab }) {
  const [tab, setTab]         = useState<Tab>(defaultTab);
  const [matches, setMatches] = useState<Match[]>([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [synced, setSynced]   = useState<string | null>(null);
  const [liveAt, setLiveAt]   = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === "live" ? "/api/live" : `/api/matches?tab=${tab}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setMatches(d.matches ?? []);
        if (d.updatedAt) setLiveAt(d.updatedAt);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  // Fetch last sync time
  useEffect(() => {
    fetch("/api/matches?tab=today")
      .then(r => r.json())
      .then(d => { if (d.syncedAt) setSynced(d.syncedAt); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    if (timerRef.current) clearInterval(timerRef.current);
    if (tab === "live") {
      timerRef.current = setInterval(load, 30_000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tab, load]);

  // Search filter
  const filtered = matches.filter(m => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      m.homeTeam.name.toLowerCase().includes(q) ||
      m.awayTeam.name.toLowerCase().includes(q) ||
      m.leagueName.toLowerCase().includes(q)
    );
  });

  // Group by league
  const groups: { leagueId: number; leagueName: string; leagueLogo: string; matches: Match[] }[] = [];
  const leagueMap = new Map<number, typeof groups[0]>();
  for (const m of filtered) {
    if (!leagueMap.has(m.leagueId)) {
      const g = { leagueId: m.leagueId, leagueName: m.leagueName, leagueLogo: m.leagueLogo, matches: [] };
      leagueMap.set(m.leagueId, g);
      groups.push(g);
    }
    leagueMap.get(m.leagueId)!.matches.push(m);
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 13, padding: 4, gap: 4, marginBottom: 14 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "9px 4px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: "0.82rem", fontWeight: 500, transition: "all 0.15s",
            background: tab === t.id
              ? t.id === "live" ? "rgba(239,68,68,0.14)" : "rgba(34,197,94,0.11)"
              : "transparent",
            color: tab === t.id
              ? t.id === "live" ? "var(--red)" : "var(--green)"
              : "rgba(255,255,255,0.35)",
            outline: tab === t.id
              ? `1px solid ${t.id === "live" ? "rgba(239,68,68,0.22)" : "rgba(34,197,94,0.18)"}`
              : "none",
          }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)", pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          placeholder="Search team or league…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "10px 12px 10px 36px",
            color: "white", fontSize: "0.875rem", outline: "none",
            fontFamily: "Inter, sans-serif",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(34,197,94,0.4)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Live refresh hint */}
      {tab === "live" && liveAt && !loading && (
        <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}>
          Updated {new Date(liveAt).toLocaleTimeString()} · auto-refreshes every 30s
        </div>
      )}

      {/* Match count */}
      {!loading && filtered.length > 0 && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>
          {filtered.length} match{filtered.length !== 1 ? "es" : ""}{search ? ` for "${search}"` : ""}
        </div>
      )}

      {/* Content */}
      {loading ? <Skeleton />
        : groups.length === 0 ? <NoData tab={tab} synced={synced} />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {groups.map(g => (
              <LeagueSection key={g.leagueId} leagueName={g.leagueName} leagueLogo={g.leagueLogo} matches={g.matches} />
            ))}
          </div>
        )}
    </div>
  );
}
