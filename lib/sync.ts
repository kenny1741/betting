// Sync Engine — supports football-data.org (FDO) + API-Football via RapidAPI
// ONE league at a time to stay within serverless timeout

import { getServiceClient } from "./supabase";
import {
  LEAGUES,
  getCurrentSeason,
  fetchFixtures,
  fetchFixturesRange,
  fetchLiveFixtures,
  fetchStandings,
  mapStatus,
  normaliseFDOMatch,
  normaliseFDOStanding,
} from "./api-football";
import {
  RAPIDAPI_LEAGUES,
  RapidApiException,
  fetchRapidFixtures,
  fetchRapidFixturesRange,
  fetchRapidStandings,
  fetchRapidLive,
  normaliseRapidMatch,
  normaliseRapidStanding,
  mapRapidStatus,
} from "./rapidapi-football";
import { buildPrediction, blendWithOdds } from "./prediction";
import { fetchMatchOdds } from "./odds";
import { format, addDays } from "date-fns";
import type { Team } from "@/types";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Combined league list ───────────────────────────────────────────────────────
// leagueIndex 0 .. LEAGUES.length-1      → FDO (football-data.org)
// leagueIndex LEAGUES.length .. end      → RapidAPI (api-football)
export const ALL_LEAGUES = [
  ...LEAGUES.map(l => ({ ...l, source: "fdo" as const, apiId: l.id })),
  ...RAPIDAPI_LEAGUES.map(l => ({ ...l, source: "rapid" as const })),
];

// ── Sync standings for ONE league ─────────────────────────────────────────────
// NOTE: `season` here is always the correct season for this league —
//       for FDO leagues it comes from getCurrentSeason(),
//       for RapidAPI leagues it comes from league.season (e.g. 2024 on free tier)
async function syncStandingsForLeague(
  league: typeof ALL_LEAGUES[0],
  season: number
): Promise<Map<number, Team>> {
  const db  = getServiceClient();
  const map = new Map<number, Team>();
  let rawRows: any[] = [];

  try {
    if (league.source === "rapid") {
      const raw = await fetchRapidStandings(league.apiId, season);
      rawRows = raw.map(normaliseRapidStanding);
    } else {
      const raw = await fetchStandings(league.id, season);
      rawRows = (raw ?? []).map(normaliseFDOStanding);
    }
  } catch (e: any) {
    if (e instanceof RapidApiException) {
      if (e.reason === "NOT_SUBSCRIBED") {
        console.warn(`⚠️  ${league.name}: not subscribed on RapidAPI — skipping standings`);
        return map;
      }
      if (e.reason === "RATE_LIMITED") {
        console.warn(`⚠️  ${league.name}: rate limited on standings — using cached stats if available`);
        return map;
      }
    }
    console.error(`Standings fetch error for ${league.name}:`, e?.message);
    return map;
  }

  if (!rawRows.length) return map;

  const upserts = rawRows.map((row: any) => {
    const team: Team = {
      id:           row.team?.id ?? 0,
      name:         row.team?.name ?? "",
      logo:         row.team?.logo ?? "",
      form:         (row.form ?? "").replace(/[,\s]/g, ""),
      position:     row.rank ?? undefined,
      played:       row.all?.played ?? 0,
      wins:         row.all?.win ?? 0,
      draws:        row.all?.draw ?? 0,
      losses:       row.all?.lose ?? 0,
      goalsFor:     row.all?.goals?.for ?? 0,
      goalsAgainst: row.all?.goals?.against ?? 0,
      points:       row.points ?? 0,
    };
    map.set(Number(team.id), team);
    return {
      team_id:       Number(team.id),
      league_id:     league.id,
      season,
      form:          team.form ?? null,
      position:      team.position ?? null,
      played:        team.played ?? 0,
      wins:          team.wins ?? 0,
      draws:         team.draws ?? 0,
      losses:        team.losses ?? 0,
      goals_for:     team.goalsFor ?? 0,
      goals_against: team.goalsAgainst ?? 0,
      points:        team.points ?? 0,
      updated_at:    new Date().toISOString(),
    };
  });

  const { error } = await db
    .from("team_stats")
    .upsert(upserts, { onConflict: "team_id,league_id,season" });
  if (error) console.error("Standings upsert error:", error.message);
  return map;
}

// ── Load team stats from Supabase ─────────────────────────────────────────────
async function loadTeamStats(leagueId: number, season: number): Promise<Map<number, Team>> {
  const db = getServiceClient();
  const { data } = await db
    .from("team_stats")
    .select("*")
    .eq("league_id", leagueId)
    .eq("season", season);

  const map = new Map<number, Team>();
  for (const row of data ?? []) {
    map.set(row.team_id, {
      id:           row.team_id,
      name:         "",
      logo:         "",
      form:         row.form ?? "",
      position:     row.position ?? undefined,
      played:       row.played ?? 0,
      wins:         row.wins ?? 0,
      draws:        row.draws ?? 0,
      losses:       row.losses ?? 0,
      goalsFor:     row.goals_for ?? 0,
      goalsAgainst: row.goals_against ?? 0,
      points:       row.points ?? 0,
    });
  }
  return map;
}

// ── Upsert a single normalised fixture ────────────────────────────────────────
async function upsertFixture(
  db: ReturnType<typeof getServiceClient>,
  raw: any,
  teamMap: Map<number, Team>,
  leagueInfo: { id: number; name: string; logo?: string; country: string; season: number; source: "fdo" | "rapid" }
): Promise<boolean> {
  try {
    const homeId  = raw?.teams?.home?.id;
    const awayId  = raw?.teams?.away?.id;
    const matchId = raw?.fixture?.id;
    if (!homeId || !awayId || !matchId) return false;

    const homeBase: Team = { id: homeId, name: raw.teams.home.name, logo: raw.teams.home.logo ?? "" };
    const awayBase: Team = { id: awayId, name: raw.teams.away.name, logo: raw.teams.away.logo ?? "" };
    const homeTeam: Team = { ...homeBase, ...(teamMap.get(Number(homeId)) ?? {}) };
    const awayTeam: Team = { ...awayBase, ...(teamMap.get(Number(awayId)) ?? {}) };

    const statusShort = raw.fixture?.status?.short ?? "NS";
    const status = leagueInfo.source === "rapid"
      ? mapRapidStatus(statusShort)
      : mapStatus(statusShort);

    const { error: mErr } = await db.from("matches").upsert({
      id:             matchId,
      league_id:      leagueInfo.id,
      league_name:    leagueInfo.name,
      league_logo:    leagueInfo.logo ?? null,
      league_country: leagueInfo.country,
      season:         leagueInfo.season,
      home_team_id:   homeId,
      home_team_name: homeTeam.name,
      home_team_logo: homeTeam.logo,
      away_team_id:   awayId,
      away_team_name: awayTeam.name,
      away_team_logo: awayTeam.logo,
      kickoff:        raw.fixture?.date ?? new Date().toISOString(),
      status,
      minute:         raw.fixture?.status?.elapsed ?? null,
      home_score:     raw.goals?.home ?? null,
      away_score:     raw.goals?.away ?? null,
      venue:          raw.fixture?.venue?.name ?? null,
      synced_at:      new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    }, { onConflict: "id" });

    if (mErr) { console.error("Match upsert error:", mErr.message); return false; }

    // Build prediction + optional odds blend
    let pred = buildPrediction(homeTeam, awayTeam);
    const oddsKey = process.env.ODDS_API_KEY;
    if (oddsKey && status === "SCHEDULED") {
      try {
        const odds = await fetchMatchOdds(homeTeam.name, awayTeam.name, raw.fixture?.date ?? "");
        if (odds) pred = blendWithOdds(pred, odds.home, odds.draw, odds.away);
      } catch (e) {
        console.warn("Odds fetch skipped:", e);
      }
    }

    const { error: pErr } = await db.from("predictions").upsert({
      match_id:       matchId,
      home_win_pct:   pred.homeWinPct,
      draw_pct:       pred.drawPct,
      away_win_pct:   pred.awayWinPct,
      btts_yes_pct:   pred.bttsYesPct,
      over25_pct:     pred.over25Pct,
      over15_pct:     pred.over15Pct,
      pick:           pred.pick,
      confidence:     pred.confidence,
      reasoning:      pred.reasoning,
      is_top_pick:    pred.isTopPick,
      odds_home:      pred.oddsHome ?? null,
      odds_draw:      pred.oddsDraw ?? null,
      odds_away:      pred.oddsAway ?? null,
      odds_home_pct:  pred.oddsHomePct ?? null,
      odds_draw_pct:  pred.oddsDrawPct ?? null,
      odds_away_pct:  pred.oddsAwayPct ?? null,
      odds_synced_at: pred.oddsHome ? new Date().toISOString() : null,
      updated_at:     new Date().toISOString(),
    }, { onConflict: "match_id" });

    if (pErr) console.error("Prediction upsert error:", pErr.message);

    // Goal events
    if (raw._goals?.length > 0) {
      await db.from("goal_events").delete().eq("match_id", matchId);
      const goals = raw._goals.map((e: any) => ({
        match_id: matchId,
        minute:   e.time?.elapsed ?? 0,
        scorer:   e.player?.name ?? "Unknown",
        assist:   e.assist?.name ?? null,
        team:     e.team?.id === homeId ? "home" : "away",
        type:     e.detail === "Own Goal" ? "own" : e.detail === "Penalty" ? "penalty" : "normal",
      }));
      await db.from("goal_events").insert(goals);
    }

    return true;
  } catch (e: any) {
    console.error("upsertFixture error:", e?.message);
    return false;
  }
}

// ── Safe wrapper for RapidAPI fetches ─────────────────────────────────────────
async function safeRapidFetch(
  leagueName: string,
  fetcher: () => Promise<any[]>
): Promise<{ fixtures: any[]; notSubscribed: boolean }> {
  try {
    const fixtures = await fetcher();
    return { fixtures, notSubscribed: false };
  } catch (e: any) {
    if (e instanceof RapidApiException) {
      if (e.reason === "NOT_SUBSCRIBED") {
        console.warn(`⚠️  ${leagueName}: not subscribed on RapidAPI — skipping`);
        return { fixtures: [], notSubscribed: true };
      }
      if (e.reason === "RATE_LIMITED") {
        console.warn(`⚠️  ${leagueName}: rate limited — skipping this league`);
        return { fixtures: [], notSubscribed: false };
      }
      if (e.reason === "AUTH_ERROR") {
        console.error(`❌ ${leagueName}: auth error — check your API key`);
        return { fixtures: [], notSubscribed: false };
      }
    }
    console.error(`⚠️  ${leagueName}: unexpected error — ${e?.message ?? e}`);
    return { fixtures: [], notSubscribed: false };
  }
}

// ── Main sync export ──────────────────────────────────────────────────────────
export async function runSync(
  type: "standings" | "today" | "tomorrow" | "upcoming" | "live" | "full",
  leagueIndex = 0
): Promise<{ success: boolean; synced?: number; error?: string; league?: string; skipped?: boolean }> {
  const db          = getServiceClient();
  const fdoSeason   = getCurrentSeason(); // only used for FDO leagues
  const now         = new Date();
  const league      = ALL_LEAGUES[leagueIndex];

  if (!league && type !== "live") {
    return { success: false, error: `Invalid league index: ${leagueIndex}` };
  }

  // ✅ KEY FIX: RapidAPI leagues use their own season (2024 on free tier),
  //            FDO leagues use getCurrentSeason() (2025)
  const season = league
    ? (league.source === "rapid" ? (league as any).season : fdoSeason)
    : fdoSeason;

  const today    = format(now, "yyyy-MM-dd");
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
  const from     = format(addDays(now, 2), "yyyy-MM-dd");
  const to       = format(addDays(now, 7), "yyyy-MM-dd");

  console.log(
    `🔄 Sync [${type}] league: ${league?.name ?? "all-live"} ` +
    `(${league?.source ?? "all"}) season: ${season}`
  );
  let synced = 0;

  try {

    // ── LIVE ──────────────────────────────────────────────────────────────────
    if (type === "live") {
      // FDO live
      const fdoLive = await fetchLiveFixtures();
      for (const lg of LEAGUES) {
        const teamMap   = await loadTeamStats(lg.id, fdoSeason);
        const lgMatches = fdoLive.filter((m: any) => m._leagueId === lg.id);
        for (const m of lgMatches) {
          const norm = normaliseFDOMatch(m, lg.id);
          const ok   = await upsertFixture(db, norm, teamMap, { ...lg, season: fdoSeason, source: "fdo" });
          if (ok) synced++;
          await delay(100);
        }
      }

      // RapidAPI live — one call covers all leagues
      const { fixtures: rapidLive } = await safeRapidFetch("live-all", () => fetchRapidLive());
      for (const lg of RAPIDAPI_LEAGUES) {
        // ✅ Each RapidAPI league uses its own season for team stats lookup
        const lgSeason  = lg.season;
        const teamMap   = await loadTeamStats(lg.id, lgSeason);
        const lgMatches = rapidLive.filter((m: any) => m.league?.id === lg.apiId);
        for (const m of lgMatches) {
          const norm = normaliseRapidMatch(m, lg.id);
          const ok   = await upsertFixture(db, norm, teamMap, { ...lg, season: lgSeason, source: "rapid" });
          if (ok) synced++;
          await delay(100);
        }
      }

    // ── STANDINGS ─────────────────────────────────────────────────────────────
    } else if (type === "standings") {
      // ✅ Pass the correct season for this league
      await syncStandingsForLeague(league, season);
      synced = 1;

    // ── FIXTURES ──────────────────────────────────────────────────────────────
    } else {
      // ✅ syncStandingsForLeague now receives league.season for rapid leagues
      const teamMap = await syncStandingsForLeague(league, season);
      if (league.source === "fdo") await delay(6500);

      let rawFixtures: any[] = [];

      if (league.source === "fdo") {
        if (type === "today" || type === "tomorrow" || type === "full") {
          rawFixtures = await fetchFixtures(league.id, season, today);
          await delay(6500);
          const tom = await fetchFixtures(league.id, season, tomorrow);
          rawFixtures = [...rawFixtures, ...tom];
        }
        if (type === "upcoming" || type === "full") {
          await delay(6500);
          const rest = await fetchFixturesRange(league.id, season, from, to);
          rawFixtures = [...rawFixtures, ...rest];
        }

        const seen = new Set<number>();
        rawFixtures = rawFixtures.filter(m => {
          if (!m?.id || seen.has(m.id)) return false;
          seen.add(m.id); return true;
        });

        console.log(`${league.name} [FDO]: ${rawFixtures.length} fixtures to sync`);
        for (const raw of rawFixtures) {
          const norm = normaliseFDOMatch(raw, league.id);
          const ok   = await upsertFixture(db, norm, teamMap, { ...league, season, source: "fdo" });
          if (ok) synced++;
          await delay(100);
        }

      } else {
        // ✅ RapidAPI path — always uses league.season, never getCurrentSeason()
        const apiId = league.apiId;
        let notSubscribed = false;

        if (type === "today" || type === "tomorrow" || type === "full") {
          const r1 = await safeRapidFetch(league.name, () => fetchRapidFixtures(apiId, season, today));
          const r2 = await safeRapidFetch(league.name, () => fetchRapidFixtures(apiId, season, tomorrow));
          notSubscribed = r1.notSubscribed || r2.notSubscribed;
          rawFixtures   = [...r1.fixtures, ...r2.fixtures];
        }

        if ((type === "upcoming" || type === "full") && !notSubscribed) {
          const r1 = await safeRapidFetch(league.name, () => fetchRapidFixtures(apiId, season, today));
          const r2 = await safeRapidFetch(league.name, () => fetchRapidFixturesRange(apiId, season, from, to));
          notSubscribed = r1.notSubscribed || r2.notSubscribed;
          rawFixtures   = [...rawFixtures, ...r1.fixtures, ...r2.fixtures];
        }

        if (notSubscribed) {
          return { success: true, synced: 0, skipped: true, league: league.name };
        }

        const seen = new Set<number>();
        rawFixtures = rawFixtures.filter(m => {
          const fid = m?.fixture?.id;
          if (!fid || seen.has(fid)) return false;
          seen.add(fid); return true;
        });

        console.log(`${league.name} [RapidAPI]: ${rawFixtures.length} fixtures to sync`);
        for (const raw of rawFixtures) {
          const norm = normaliseRapidMatch(raw, league.id);
          const ok   = await upsertFixture(db, norm, teamMap, { ...league, season, source: "rapid" });
          if (ok) synced++;
          await delay(100);
        }
      }
    }

    await db.from("sync_log").insert({
      sync_type: `${type}_${league?.name ?? "live"}`,
      status:    "success",
      records:   synced,
      message:   `Synced ${synced} records`,
    });

    return { success: true, synced, league: league?.name ?? "live" };

  } catch (e: any) {
    console.error("runSync error:", e);
    await db.from("sync_log").insert({
      sync_type: type,
      status:    "error",
      message:   e?.message ?? "Unknown",
      records:   0,
    });
    return { success: false, error: e?.message ?? "Unknown sync error" };
  }
}