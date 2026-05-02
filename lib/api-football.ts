// ─────────────────────────────────────────────────────────────────────────────
// Football-Data.org API client
// Free tier: 10 requests/minute, no daily cap
// Docs: https://www.football-data.org/documentation/quickstart
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://api.football-data.org/v4";

function headers() {
  return {
    "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY ?? "",
  };
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Rate-limited fetch ────────────────────────────────────────────────────────
// Free tier: 10 requests/minute = 1 request every 6s minimum
// We use 8s to stay safely under the limit
async function apiFetch(path: string, retries = 1): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: headers(),
        cache: "no-store",
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? "60", 10);
        console.warn(`⚠️ Rate limited on ${path}, waiting ${retryAfter}s...`);
        await delay(retryAfter * 1000);
        continue;
      }

      if (res.status === 403 || res.status === 401) {
        const body = await res.text().catch(() => "");
        console.error(`❌ Auth error ${res.status} for ${path}: ${body.slice(0, 200)}`);
        console.error("Check your FOOTBALL_DATA_API_KEY in .env.local");
        return null;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`❌ API error ${res.status} for ${path}: ${body.slice(0, 200)}`);
        if (attempt < retries) { await delay(3000); continue; }
        return null;
      }

      return await res.json();
    } catch (e) {
      console.error(`❌ Fetch error for ${path}:`, e);
      if (attempt < retries) await delay(3000);
    }
  }
  return null;
}

// ── League configuration ──────────────────────────────────────────────────────
export const LEAGUES = [
  {
    id:      39,
    code:    "PL",
    name:    "Premier League",
    country: "England",
    logo:    "https://crests.football-data.org/PL.png",
    season:  2024,
  },
  {
    id:      140,
    code:    "PD",
    name:    "La Liga",
    country: "Spain",
    logo:    "https://crests.football-data.org/PD.png",
    season:  2024,
  },
  {
    id:      135,
    code:    "SA",
    name:    "Serie A",
    country: "Italy",
    logo:    "https://crests.football-data.org/SA.png",
    season:  2024,
  },
  {
    id:      78,
    code:    "BL1",
    name:    "Bundesliga",
    country: "Germany",
    logo:    "https://crests.football-data.org/BL1.png",
    season:  2024,
  },
  {
    id:      61,
    code:    "FL1",
    name:    "Ligue 1",
    country: "France",
    logo:    "https://crests.football-data.org/FL1.png",
    season:  2024,
  },
  {
    id:      94,
    code:    "PPL",
    name:    "Primeira Liga",
    country: "Portugal",
    logo:    "https://crests.football-data.org/PPL.png",
    season:  2024,
  },
  {
    id:      88,
    code:    "DED",
    name:    "Eredivisie",
    country: "Netherlands",
    logo:    "https://crests.football-data.org/DED.png",
    season:  2024,
  },
  {
    id:      2013,
    code:    "BSA",
    name:    "Brasileirão Série A",
    country: "Brazil",
    logo:    "https://crests.football-data.org/BSA.png",
    season:  2025,
  },
  {
    id:      2001,
    code:    "CL",
    name:    "Champions League",
    country: "Europe",
    logo:    "https://crests.football-data.org/CL.png",
    season:  2024,
  },
  {
    id:      2016,
    code:    "ELC",
    name:    "Championship",
    country: "England",
    logo:    "https://crests.football-data.org/ELC.png",
    season:  2024,
  },
];

export function getCurrentSeason() {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

// ── Status mapper ─────────────────────────────────────────────────────────────
export function mapStatus(fdoStatus: string): string {
  const m: Record<string, string> = {
    SCHEDULED:  "SCHEDULED",
    TIMED:      "SCHEDULED",
    NS:         "SCHEDULED",
    IN_PLAY:    "LIVE",
    LIVE:       "LIVE",
    "1H":       "LIVE",
    PAUSED:     "HT",
    HT:         "HT",
    "2H":       "LIVE",
    ET:         "LIVE",
    P:          "LIVE",
    FINISHED:   "FT",
    FT:         "FT",
    AET:        "FT",
    PEN:        "FT",
    POSTPONED:  "POSTPONED",
    PST:        "POSTPONED",
    CANCELLED:  "CANCELLED",
    CANC:       "CANCELLED",
    SUSP:       "CANCELLED",
  };
  return m[fdoStatus] ?? "SCHEDULED";
}

// ── Fetch fixtures for a specific date ───────────────────────────────────────
export async function fetchFixtures(leagueId: number, _season: number, date: string) {
  await delay(8000); // ✅ increased from 6500 → 8000ms to stay safely under 10 req/min
  const league = LEAGUES.find(l => l.id === leagueId);
  if (!league) return [];
  console.log(`📡 FDO fixtures: ${league.code} date=${date}`);
  const data = await apiFetch(`/competitions/${league.code}/matches?dateFrom=${date}&dateTo=${date}`);
  return data?.matches ?? [];
}

// ── Fetch fixtures for a date range ──────────────────────────────────────────
export async function fetchFixturesRange(leagueId: number, _season: number, from: string, to: string) {
  await delay(8000);
  const league = LEAGUES.find(l => l.id === leagueId);
  if (!league) return [];
  console.log(`📡 FDO fixtures range: ${league.code} from=${from} to=${to}`);
  const data = await apiFetch(`/competitions/${league.code}/matches?dateFrom=${from}&dateTo=${to}`);
  return data?.matches ?? [];
}

// ── Fetch live fixtures ───────────────────────────────────────────────────────
export async function fetchLiveFixtures() {
  const results: any[] = [];
  for (const league of LEAGUES) {
    await delay(8000);
    console.log(`📡 FDO live: ${league.code}`);
    const data = await apiFetch(`/competitions/${league.code}/matches?status=IN_PLAY,PAUSED`);
    const matches = (data?.matches ?? []).map((m: any) => ({ ...m, _leagueId: league.id }));
    results.push(...matches);
  }
  return results;
}

// ── Fetch standings ───────────────────────────────────────────────────────────
export async function fetchStandings(leagueId: number, _season: number) {
  await delay(8000);
  const league = LEAGUES.find(l => l.id === leagueId);
  if (!league) return [];
  console.log(`📡 FDO standings: ${league.code}`);
  const data = await apiFetch(`/competitions/${league.code}/standings`);
  const total = data?.standings?.find((s: any) => s.type === "TOTAL");
  return total?.table ?? [];
}

// ── Lineups — not available on FDO free tier ──────────────────────────────────
export async function fetchLineups(_fixtureId: number) {
  return [];
}

// ── Goal events — not available as separate endpoint on FDO ──────────────────
export async function fetchEvents(_fixtureId: number) {
  return [];
}

// ── Normalise FDO match → internal format ────────────────────────────────────
export function normaliseFDOMatch(m: any, leagueId: number) {
  const league = LEAGUES.find(l => l.id === leagueId) ?? LEAGUES[0];
  return {
    fixture: {
      id:     m.id,
      date:   m.utcDate,
      status: { short: mapFDOStatus(m.status), elapsed: m.minute ?? null },
      venue:  { name: m.venue ?? null },
    },
    league: {
      id:     leagueId,
      season: league.season,
    },
    teams: {
      home: {
        id:   m.homeTeam?.id ?? 0,
        name: m.homeTeam?.name ?? m.homeTeam?.shortName ?? "TBD",
        logo: m.homeTeam?.crest ?? "",
      },
      away: {
        id:   m.awayTeam?.id ?? 0,
        name: m.awayTeam?.name ?? m.awayTeam?.shortName ?? "TBD",
        logo: m.awayTeam?.crest ?? "",
      },
    },
    goals: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
    },
    _goals: (m.goals ?? []).map((g: any) => ({
      type:   "Goal",
      time:   { elapsed: g.minute ?? 0 },
      player: { name: g.scorer?.name ?? "Unknown" },
      assist: { name: g.assist?.name ?? null },
      team:   { id: g.team?.id ?? 0 },
      detail: g.type === "OWN_GOAL" ? "Own Goal" : g.type === "PENALTY" ? "Penalty" : "Normal Goal",
    })),
  };
}

function mapFDOStatus(status: string): string {
  const m: Record<string, string> = {
    SCHEDULED: "NS",   TIMED:     "NS",
    IN_PLAY:   "LIVE", PAUSED:    "HT",
    FINISHED:  "FT",   POSTPONED: "PST",
    CANCELLED: "CANC", SUSPENDED: "SUSP",
  };
  return m[status] ?? "NS";
}

// ── Normalise FDO standings row → internal format ─────────────────────────────
export function normaliseFDOStanding(row: any) {
  return {
    team:   { id: row.team?.id, name: row.team?.name, logo: row.team?.crest ?? "" },
    rank:   row.position,
    form:   (row.form ?? "").replace(/[,\s]/g, ""),
    points: row.points,
    all: {
      played: row.playedGames ?? 0,
      win:    row.won ?? 0,
      draw:   row.draw ?? 0,
      lose:   row.lost ?? 0,
      goals:  { for: row.goalsFor ?? 0, against: row.goalsAgainst ?? 0 },
    },
  };
}

// ── Key test helper ───────────────────────────────────────────────────────────
export async function testApiKey() {
  try {
    const res = await fetch(`${BASE}/competitions`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: body.slice(0, 200) };
    }
    const data = await res.json();
    return { ok: true, competitions: data?.count ?? 0 };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}