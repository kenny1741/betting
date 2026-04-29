// All reads go through here — Supabase + in-memory cache
// Frontend never calls API-Football directly

// All reads go through here — Supabase + in-memory cache
// Frontend never calls API-Football directly

// All reads go through here — Supabase + in-memory cache
// Frontend never calls API-Football directly

import { getPublicClient } from "./supabase";
import type { Match, Team, Prediction, GoalEvent, LineupTeam, Player } from "@/types";

// ── Simple in-memory cache ─────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; exp: number }
const cache = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || entry.exp < Date.now()) { cache.delete(key); return null; }
  return entry.data as T;
}
function cacheSet<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, exp: Date.now() + ttlMs });
}

const TTL_MATCHES   = 2 * 60 * 1000;  // 2 min
const TTL_LIVE      = 30 * 1000;       // 30 sec
const TTL_PICKS     = 5 * 60 * 1000;  // 5 min

// ── Map DB row → Match ────────────────────────────────────────────────────────
function rowToMatch(row: any): Match {
  const pred = row.predictions;
  const goals: GoalEvent[] = (row.goal_events ?? []).map((g: any) => ({
    minute:  g.minute,
    scorer:  g.scorer,
    assist:  g.assist ?? undefined,
    team:    g.team as "home" | "away",
    type:    g.type as "normal" | "own" | "penalty",
  }));

  function mapLineup(lu: any): LineupTeam | undefined {
    if (!lu) return undefined;
    return {
      formation:  lu.formation ?? "",
      startXI:    (lu.start_xi ?? []) as Player[],
      substitutes: (lu.substitutes ?? []) as Player[],
    };
  }

  const homeLineup = (row.lineups ?? []).find((l: any) => l.team_id === row.home_team_id);
  const awayLineup = (row.lineups ?? []).find((l: any) => l.team_id === row.away_team_id);

  // Load team stats if available
  const homeStats = (row.home_stats ?? {});
  const awayStats = (row.away_stats ?? {});

  const homeTeam: Team = {
    id:           row.home_team_id,
    name:         row.home_team_name,
    logo:         row.home_team_logo ?? "",
    form:         homeStats.form,
    position:     homeStats.position,
    played:       homeStats.played,
    wins:         homeStats.wins,
    draws:        homeStats.draws,
    losses:       homeStats.losses,
    goalsFor:     homeStats.goals_for,
    goalsAgainst: homeStats.goals_against,
    points:       homeStats.points,
  };

  const awayTeam: Team = {
    id:           row.away_team_id,
    name:         row.away_team_name,
    logo:         row.away_team_logo ?? "",
    form:         awayStats.form,
    position:     awayStats.position,
    played:       awayStats.played,
    wins:         awayStats.wins,
    draws:        awayStats.draws,
    losses:       awayStats.losses,
    goalsFor:     awayStats.goals_for,
    goalsAgainst: awayStats.goals_against,
    points:       awayStats.points,
  };

  const prediction: Prediction = pred ? {
    homeWinPct:      pred.home_win_pct,
    drawPct:         pred.draw_pct,
    awayWinPct:      pred.away_win_pct,
    bttsYesPct:      pred.btts_yes_pct,
    over25Pct:       pred.over25_pct,
    over15Pct:       pred.over15_pct,
    pick:            pred.pick,
    confidence:      pred.confidence,
    reasoning:       typeof pred.reasoning === "string"
                       ? (() => { try { return JSON.parse(pred.reasoning); } catch { return []; } })()
                       : (Array.isArray(pred.reasoning) ? pred.reasoning : []),
    isTopPick:       pred.is_top_pick ?? false,
    oddsHome:        pred.odds_home ?? null,
    oddsDraw:        pred.odds_draw ?? null,
    oddsAway:        pred.odds_away ?? null,
    oddsHomePct:     pred.odds_home_pct ?? null,
    oddsDrawPct:     pred.odds_draw_pct ?? null,
    oddsAwayPct:     pred.odds_away_pct ?? null,
    marketAgreement: null,
  } : {
    homeWinPct: 40, drawPct: 28, awayWinPct: 32,
    bttsYesPct: 50, over25Pct: 50, over15Pct: 70,
    pick: "HOME", confidence: 40, reasoning: ["Insufficient data"], isTopPick: false,
  };

  return {
    id:            row.id,
    leagueId:      row.league_id,
    leagueName:    row.league_name,
    leagueLogo:    row.league_logo ?? "",
    leagueCountry: row.league_country ?? "",
    season:        row.season,
    homeTeam,
    awayTeam,
    kickoff:       row.kickoff,
    status:        row.status as any,
    minute:        row.minute ?? null,
    homeScore:     row.home_score ?? null,
    awayScore:     row.away_score ?? null,
    goals,
    prediction,
    homeLineup:    mapLineup(homeLineup),
    awayLineup:    mapLineup(awayLineup),
    venue:         row.venue ?? undefined,
    syncedAt:      row.synced_at,
  };
}

// ── Base query with all joins ──────────────────────────────────────────────────
async function queryMatches(filters: {
  statusIn?: string[];
  kickoffFrom?: string;
  kickoffTo?: string;
  orderBy?: string;
  limit?: number;
}): Promise<Match[]> {
  const db = getPublicClient();
  const season = new Date().getMonth() >= 7
    ? new Date().getFullYear()
    : new Date().getFullYear() - 1;

  let q = db
    .from("matches")
    .select(`
      *,
      predictions(*),
      goal_events(*),
      lineups(*)
    `);

  if (filters.statusIn?.length) {
    q = q.in("status", filters.statusIn);
  }
  if (filters.kickoffFrom) q = q.gte("kickoff", filters.kickoffFrom);
  if (filters.kickoffTo)   q = q.lte("kickoff", filters.kickoffTo);

  q = q.order(filters.orderBy ?? "kickoff", { ascending: true });
  if (filters.limit) q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) { console.error("DB query error:", error); return []; }
  if (!data?.length) return [];

  // Load team stats for enrichment
  const matches = await enrichWithTeamStats(data, season);
  return matches.map(rowToMatch);
}

async function enrichWithTeamStats(rows: any[], season: number): Promise<any[]> {
  if (!rows.length) return rows;
  const db = getPublicClient();

  // Collect unique team IDs and league IDs
  const pairs = new Set<string>();
  for (const r of rows) {
    pairs.add(`${r.home_team_id}:${r.league_id}`);
    pairs.add(`${r.away_team_id}:${r.league_id}`);
  }

  const teamIds    = rows.flatMap(r => [r.home_team_id, r.away_team_id]);
  const leagueIds  = [...new Set(rows.map(r => r.league_id))];

  const { data: statsData } = await db
    .from("team_stats")
    .select("*")
    .in("team_id", teamIds)
    .in("league_id", leagueIds)
    .eq("season", season);

  const statsMap = new Map<string, any>();
  for (const s of statsData ?? []) {
    statsMap.set(`${s.team_id}:${s.league_id}`, s);
  }

  return rows.map(r => ({
    ...r,
    home_stats: statsMap.get(`${r.home_team_id}:${r.league_id}`) ?? null,
    away_stats: statsMap.get(`${r.away_team_id}:${r.league_id}`) ?? null,
  }));
}

// ── Public read functions ──────────────────────────────────────────────────────

export async function getTodayMatches(): Promise<Match[]> {
  const key = "today";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: start.toISOString(),
    kickoffTo:   end.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getTomorrowMatches(): Promise<Match[]> {
  const key = "tomorrow";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  const start = new Date(tom); start.setHours(0, 0, 0, 0);
  const end   = new Date(tom); end.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: start.toISOString(),
    kickoffTo:   end.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getUpcomingMatches(): Promise<Match[]> {
  const key = "upcoming";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const from = new Date(); from.setDate(from.getDate() + 2); from.setHours(0, 0, 0, 0);
  const to   = new Date(); to.setDate(to.getDate() + 8);   to.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: from.toISOString(),
    kickoffTo:   to.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getLiveMatches(): Promise<Match[]> {
  const key = "live";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const data = await queryMatches({
    statusIn: ["LIVE", "1H", "HT", "2H", "ET", "P"],
  });

  cacheSet(key, data, TTL_LIVE);
  return data;
}

export async function getTopPicks(): Promise<Match[]> {
  const key = "top_picks";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  // Top picks = today's matches with is_top_pick = true, confidence >= 80
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);

  const db = getPublicClient();
  const season = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

  const { data, error } = await db
    .from("matches")
    .select(`*, predictions(*), goal_events(*), lineups(*)`)
    .gte("kickoff", start.toISOString())
    .lte("kickoff", end.toISOString())
    .eq("predictions.is_top_pick", true)
    .order("kickoff");

  if (error || !data) return [];

  const enriched = await enrichWithTeamStats(data, season);
  const result = enriched
    .map(rowToMatch)
    .filter(m => m.prediction.isTopPick && m.prediction.confidence >= 80)
    .sort((a, b) => b.prediction.confidence - a.prediction.confidence)
    .slice(0, 3);

  cacheSet(key, result, TTL_PICKS);
  return result;
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = getPublicClient();
  const { data } = await db
    .from("sync_log")
    .select("synced_at")
    .eq("status", "success")
    .order("synced_at", { ascending: false })
    .limit(1);
  return data?.[0]?.synced_at ?? null;
}







/*


import { getPublicClient } from "./supabase";
import type { Match, Team, Prediction, GoalEvent, LineupTeam, Player } from "@/types";

// ── Simple in-memory cache ─────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; exp: number }
const cache = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || entry.exp < Date.now()) { cache.delete(key); return null; }
  return entry.data as T;
}
function cacheSet<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, exp: Date.now() + ttlMs });
}

const TTL_MATCHES   = 2 * 60 * 1000;  // 2 min
const TTL_LIVE      = 30 * 1000;       // 30 sec
const TTL_PICKS     = 5 * 60 * 1000;  // 5 min

// ── Map DB row → Match ────────────────────────────────────────────────────────
function rowToMatch(row: any): Match {
  const pred = row.predictions;
  const goals: GoalEvent[] = (row.goal_events ?? []).map((g: any) => ({
    minute:  g.minute,
    scorer:  g.scorer,
    assist:  g.assist ?? undefined,
    team:    g.team as "home" | "away",
    type:    g.type as "normal" | "own" | "penalty",
  }));

  function mapLineup(lu: any): LineupTeam | undefined {
    if (!lu) return undefined;
    return {
      formation:  lu.formation ?? "",
      startXI:    (lu.start_xi ?? []) as Player[],
      substitutes: (lu.substitutes ?? []) as Player[],
    };
  }

  const homeLineup = (row.lineups ?? []).find((l: any) => l.team_id === row.home_team_id);
  const awayLineup = (row.lineups ?? []).find((l: any) => l.team_id === row.away_team_id);

  // Load team stats if available
  const homeStats = (row.home_stats ?? {});
  const awayStats = (row.away_stats ?? {});

  const homeTeam: Team = {
    id:           row.home_team_id,
    name:         row.home_team_name,
    logo:         row.home_team_logo ?? "",
    form:         homeStats.form,
    position:     homeStats.position,
    played:       homeStats.played,
    wins:         homeStats.wins,
    draws:        homeStats.draws,
    losses:       homeStats.losses,
    goalsFor:     homeStats.goals_for,
    goalsAgainst: homeStats.goals_against,
    points:       homeStats.points,
  };

  const awayTeam: Team = {
    id:           row.away_team_id,
    name:         row.away_team_name,
    logo:         row.away_team_logo ?? "",
    form:         awayStats.form,
    position:     awayStats.position,
    played:       awayStats.played,
    wins:         awayStats.wins,
    draws:        awayStats.draws,
    losses:       awayStats.losses,
    goalsFor:     awayStats.goals_for,
    goalsAgainst: awayStats.goals_against,
    points:       awayStats.points,
  };

  const prediction: Prediction = pred ? {
    homeWinPct:  pred.home_win_pct,
    drawPct:     pred.draw_pct,
    awayWinPct:  pred.away_win_pct,
    bttsYesPct:  pred.btts_yes_pct,
    over25Pct:   pred.over25_pct,
    over15Pct:   pred.over15_pct,
    pick:        pred.pick,
    confidence:  pred.confidence,
    reasoning:   typeof pred.reasoning === "string"
                   ? (() => { try { return JSON.parse(pred.reasoning); } catch { return []; } })()
                   : (Array.isArray(pred.reasoning) ? pred.reasoning : []),
    isTopPick:   pred.is_top_pick ?? false,
  } : {
    homeWinPct: 40, drawPct: 28, awayWinPct: 32,
    bttsYesPct: 50, over25Pct: 50, over15Pct: 70,
    pick: "HOME", confidence: 40, reasoning: ["Insufficient data"], isTopPick: false,
  };

  return {
    id:            row.id,
    leagueId:      row.league_id,
    leagueName:    row.league_name,
    leagueLogo:    row.league_logo ?? "",
    leagueCountry: row.league_country ?? "",
    season:        row.season,
    homeTeam,
    awayTeam,
    kickoff:       row.kickoff,
    status:        row.status as any,
    minute:        row.minute ?? null,
    homeScore:     row.home_score ?? null,
    awayScore:     row.away_score ?? null,
    goals,
    prediction,
    homeLineup:    mapLineup(homeLineup),
    awayLineup:    mapLineup(awayLineup),
    venue:         row.venue ?? undefined,
    syncedAt:      row.synced_at,
  };
}

// ── Base query with all joins ──────────────────────────────────────────────────
async function queryMatches(filters: {
  statusIn?: string[];
  kickoffFrom?: string;
  kickoffTo?: string;
  orderBy?: string;
  limit?: number;
}): Promise<Match[]> {
  const db = getPublicClient();
  const season = new Date().getMonth() >= 7
    ? new Date().getFullYear()
    : new Date().getFullYear() - 1;

  let q = db
    .from("matches")
    .select(`
      *,
      predictions(*),
      goal_events(*),
      lineups(*)
    `);

  if (filters.statusIn?.length) {
    q = q.in("status", filters.statusIn);
  }
  if (filters.kickoffFrom) q = q.gte("kickoff", filters.kickoffFrom);
  if (filters.kickoffTo)   q = q.lte("kickoff", filters.kickoffTo);

  q = q.order(filters.orderBy ?? "kickoff", { ascending: true });
  if (filters.limit) q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) { console.error("DB query error:", error); return []; }
  if (!data?.length) return [];

  // Load team stats for enrichment
  const matches = await enrichWithTeamStats(data, season);
  return matches.map(rowToMatch);
}

async function enrichWithTeamStats(rows: any[], season: number): Promise<any[]> {
  if (!rows.length) return rows;
  const db = getPublicClient();

  // Collect unique team IDs and league IDs
  const pairs = new Set<string>();
  for (const r of rows) {
    pairs.add(`${r.home_team_id}:${r.league_id}`);
    pairs.add(`${r.away_team_id}:${r.league_id}`);
  }

  const teamIds    = rows.flatMap(r => [r.home_team_id, r.away_team_id]);
  const leagueIds  = [...new Set(rows.map(r => r.league_id))];

  const { data: statsData } = await db
    .from("team_stats")
    .select("*")
    .in("team_id", teamIds)
    .in("league_id", leagueIds)
    .eq("season", season);

  const statsMap = new Map<string, any>();
  for (const s of statsData ?? []) {
    statsMap.set(`${s.team_id}:${s.league_id}`, s);
  }

  return rows.map(r => ({
    ...r,
    home_stats: statsMap.get(`${r.home_team_id}:${r.league_id}`) ?? null,
    away_stats: statsMap.get(`${r.away_team_id}:${r.league_id}`) ?? null,
  }));
}

// ── Public read functions ──────────────────────────────────────────────────────

export async function getTodayMatches(): Promise<Match[]> {
  const key = "today";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: start.toISOString(),
    kickoffTo:   end.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getTomorrowMatches(): Promise<Match[]> {
  const key = "tomorrow";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  const start = new Date(tom); start.setHours(0, 0, 0, 0);
  const end   = new Date(tom); end.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: start.toISOString(),
    kickoffTo:   end.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getUpcomingMatches(): Promise<Match[]> {
  const key = "upcoming";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const from = new Date(); from.setDate(from.getDate() + 2); from.setHours(0, 0, 0, 0);
  const to   = new Date(); to.setDate(to.getDate() + 8);   to.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: from.toISOString(),
    kickoffTo:   to.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getLiveMatches(): Promise<Match[]> {
  const key = "live";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const data = await queryMatches({
    statusIn: ["LIVE", "1H", "HT", "2H", "ET", "P"],
  });

  cacheSet(key, data, TTL_LIVE);
  return data;
}

export async function getTopPicks(): Promise<Match[]> {
  const key = "top_picks";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  // Top picks = today's matches with is_top_pick = true, confidence >= 80
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);

  const db = getPublicClient();
  const season = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

  const { data, error } = await db
    .from("matches")
    .select(`*, predictions(*), goal_events(*), lineups(*)`)
    .gte("kickoff", start.toISOString())
    .lte("kickoff", end.toISOString())
    .eq("predictions.is_top_pick", true)
    .order("kickoff");

  if (error || !data) return [];

  const enriched = await enrichWithTeamStats(data, season);
  const result = enriched
    .map(rowToMatch)
    .filter(m => m.prediction.isTopPick && m.prediction.confidence >= 80)
    .sort((a, b) => b.prediction.confidence - a.prediction.confidence)
    .slice(0, 3);

  cacheSet(key, result, TTL_PICKS);
  return result;
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = getPublicClient();
  const { data } = await db
    .from("sync_log")
    .select("synced_at")
    .eq("status", "success")
    .order("synced_at", { ascending: false })
    .limit(1);
  return data?.[0]?.synced_at ?? null;
}


/*import { getPublicClient } from "./supabase";
import type { Match, Team, Prediction, GoalEvent, LineupTeam, Player } from "@/types";

// ── Simple in-memory cache ─────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; exp: number }
const cache = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || entry.exp < Date.now()) { cache.delete(key); return null; }
  return entry.data as T;
}
function cacheSet<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, exp: Date.now() + ttlMs });
}

const TTL_MATCHES   = 2 * 60 * 1000;  // 2 min
const TTL_LIVE      = 30 * 1000;       // 30 sec
const TTL_PICKS     = 5 * 60 * 1000;  // 5 min

// ── Map DB row → Match ────────────────────────────────────────────────────────
function rowToMatch(row: any): Match {
  const pred = row.predictions;
  const goals: GoalEvent[] = (row.goal_events ?? []).map((g: any) => ({
    minute:  g.minute,
    scorer:  g.scorer,
    assist:  g.assist ?? undefined,
    team:    g.team as "home" | "away",
    type:    g.type as "normal" | "own" | "penalty",
  }));

  function mapLineup(lu: any): LineupTeam | undefined {
    if (!lu) return undefined;
    return {
      formation:  lu.formation ?? "",
      startXI:    (lu.start_xi ?? []) as Player[],
      substitutes: (lu.substitutes ?? []) as Player[],
    };
  }

  const homeLineup = (row.lineups ?? []).find((l: any) => l.team_id === row.home_team_id);
  const awayLineup = (row.lineups ?? []).find((l: any) => l.team_id === row.away_team_id);

  // Load team stats if available
  const homeStats = (row.home_stats ?? {});
  const awayStats = (row.away_stats ?? {});

  const homeTeam: Team = {
    id:           row.home_team_id,
    name:         row.home_team_name,
    logo:         row.home_team_logo ?? "",
    form:         homeStats.form,
    position:     homeStats.position,
    played:       homeStats.played,
    wins:         homeStats.wins,
    draws:        homeStats.draws,
    losses:       homeStats.losses,
    goalsFor:     homeStats.goals_for,
    goalsAgainst: homeStats.goals_against,
    points:       homeStats.points,
  };

  const awayTeam: Team = {
    id:           row.away_team_id,
    name:         row.away_team_name,
    logo:         row.away_team_logo ?? "",
    form:         awayStats.form,
    position:     awayStats.position,
    played:       awayStats.played,
    wins:         awayStats.wins,
    draws:        awayStats.draws,
    losses:       awayStats.losses,
    goalsFor:     awayStats.goals_for,
    goalsAgainst: awayStats.goals_against,
    points:       awayStats.points,
  };

  const prediction: Prediction = pred ? {
    homeWinPct:  pred.home_win_pct,
    drawPct:     pred.draw_pct,
    awayWinPct:  pred.away_win_pct,
    bttsYesPct:  pred.btts_yes_pct,
    over25Pct:   pred.over25_pct,
    over15Pct:   pred.over15_pct,
    pick:        pred.pick,
    confidence:  pred.confidence,
    reasoning:   pred.reasoning ?? [],
    isTopPick:   pred.is_top_pick ?? false,
  } : {
    homeWinPct: 40, drawPct: 28, awayWinPct: 32,
    bttsYesPct: 50, over25Pct: 50, over15Pct: 70,
    pick: "HOME", confidence: 40, reasoning: ["Insufficient data"], isTopPick: false,
  };

  return {
    id:            row.id,
    leagueId:      row.league_id,
    leagueName:    row.league_name,
    leagueLogo:    row.league_logo ?? "",
    leagueCountry: row.league_country ?? "",
    season:        row.season,
    homeTeam,
    awayTeam,
    kickoff:       row.kickoff,
    status:        row.status as any,
    minute:        row.minute ?? null,
    homeScore:     row.home_score ?? null,
    awayScore:     row.away_score ?? null,
    goals,
    prediction,
    homeLineup:    mapLineup(homeLineup),
    awayLineup:    mapLineup(awayLineup),
    venue:         row.venue ?? undefined,
    syncedAt:      row.synced_at,
  };
}

// ── Base query with all joins ──────────────────────────────────────────────────
async function queryMatches(filters: {
  statusIn?: string[];
  kickoffFrom?: string;
  kickoffTo?: string;
  orderBy?: string;
  limit?: number;
}): Promise<Match[]> {
  const db = getPublicClient();
  const season = new Date().getMonth() >= 7
    ? new Date().getFullYear()
    : new Date().getFullYear() - 1;

  let q = db
    .from("matches")
    .select(`
      *,
      predictions(*),
      goal_events(*),
      lineups(*)
    `);

  if (filters.statusIn?.length) {
    q = q.in("status", filters.statusIn);
  }
  if (filters.kickoffFrom) q = q.gte("kickoff", filters.kickoffFrom);
  if (filters.kickoffTo)   q = q.lte("kickoff", filters.kickoffTo);

  q = q.order(filters.orderBy ?? "kickoff", { ascending: true });
  if (filters.limit) q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) { console.error("DB query error:", error); return []; }
  if (!data?.length) return [];

  // Load team stats for enrichment
  const matches = await enrichWithTeamStats(data, season);
  return matches.map(rowToMatch);
}

async function enrichWithTeamStats(rows: any[], season: number): Promise<any[]> {
  if (!rows.length) return rows;
  const db = getPublicClient();

  // Collect unique team IDs and league IDs
  const pairs = new Set<string>();
  for (const r of rows) {
    pairs.add(`${r.home_team_id}:${r.league_id}`);
    pairs.add(`${r.away_team_id}:${r.league_id}`);
  }

  const teamIds    = rows.flatMap(r => [r.home_team_id, r.away_team_id]);
  const leagueIds  = [...new Set(rows.map(r => r.league_id))];

  const { data: statsData } = await db
    .from("team_stats")
    .select("*")
    .in("team_id", teamIds)
    .in("league_id", leagueIds)
    .eq("season", season);

  const statsMap = new Map<string, any>();
  for (const s of statsData ?? []) {
    statsMap.set(`${s.team_id}:${s.league_id}`, s);
  }

  return rows.map(r => ({
    ...r,
    home_stats: statsMap.get(`${r.home_team_id}:${r.league_id}`) ?? null,
    away_stats: statsMap.get(`${r.away_team_id}:${r.league_id}`) ?? null,
  }));
}

// ── Public read functions ──────────────────────────────────────────────────────

export async function getTodayMatches(): Promise<Match[]> {
  const key = "today";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: start.toISOString(),
    kickoffTo:   end.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getTomorrowMatches(): Promise<Match[]> {
  const key = "tomorrow";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  const start = new Date(tom); start.setHours(0, 0, 0, 0);
  const end   = new Date(tom); end.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: start.toISOString(),
    kickoffTo:   end.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getUpcomingMatches(): Promise<Match[]> {
  const key = "upcoming";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const from = new Date(); from.setDate(from.getDate() + 2); from.setHours(0, 0, 0, 0);
  const to   = new Date(); to.setDate(to.getDate() + 8);   to.setHours(23, 59, 59, 999);

  const data = await queryMatches({
    kickoffFrom: from.toISOString(),
    kickoffTo:   to.toISOString(),
  });

  cacheSet(key, data, TTL_MATCHES);
  return data;
}

export async function getLiveMatches(): Promise<Match[]> {
  const key = "live";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const data = await queryMatches({
    statusIn: ["LIVE", "1H", "HT", "2H", "ET", "P"],
  });

  cacheSet(key, data, TTL_LIVE);
  return data;
}

export async function getTopPicks(): Promise<Match[]> {
  const key = "top_picks";
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  // Top picks = today's matches with is_top_pick = true, confidence >= 80
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);

  const db = getPublicClient();
  const season = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

  const { data, error } = await db
    .from("matches")
    .select(`*, predictions(*), goal_events(*), lineups(*)`)
    .gte("kickoff", start.toISOString())
    .lte("kickoff", end.toISOString())
    .eq("predictions.is_top_pick", true)
    .order("kickoff");

  if (error || !data) return [];

  const enriched = await enrichWithTeamStats(data, season);
  const result = enriched
    .map(rowToMatch)
    .filter(m => m.prediction.isTopPick && m.prediction.confidence >= 80)
    .sort((a, b) => b.prediction.confidence - a.prediction.confidence)
    .slice(0, 3);

  cacheSet(key, result, TTL_PICKS);
  return result;
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = getPublicClient();
  const { data } = await db
    .from("sync_log")
    .select("synced_at")
    .eq("status", "success")
    .order("synced_at", { ascending: false })
    .limit(1);
  return data?.[0]?.synced_at ?? null;
}
*/