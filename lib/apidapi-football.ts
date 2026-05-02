// ─────────────────────────────────────────────────────────────────────────────
// API-Football — OFFICIAL DIRECT CLIENT (api-sports.io)
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://v3.football.api-sports.io";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Get & validate the API key once ──────────────────────────────────────────
function getApiKey(): string | null {
  const key =
    process.env.FOOTBALL_API_KEY ||
    process.env.NEXT_PUBLIC_FOOTBALL_API_KEY ||
    process.env.RAPIDAPI_KEY ||
    process.env.API_SPORTS_KEY ||       // common alternative name
    process.env.API_FOOTBALL_KEY;       // common alternative name

  if (!key || key.trim() === "") {
    console.error(
      "❌ API KEY MISSING — checked: FOOTBALL_API_KEY, NEXT_PUBLIC_FOOTBALL_API_KEY, " +
      "RAPIDAPI_KEY, API_SPORTS_KEY, API_FOOTBALL_KEY. " +
      "Add the correct one to your .env.local"
    );
    return null;
  }
  return key.trim();
}

// ── Custom exception ──────────────────────────────────────────────────────────
export class RapidApiException extends Error {
  constructor(
    public reason: "NOT_SUBSCRIBED" | "RATE_LIMITED" | "AUTH_ERROR" | "API_ERROR" | "NO_KEY",
    message: string
  ) {
    super(message);
    this.name = "RapidApiException";
  }
}

// ── Core fetch with full error handling ───────────────────────────────────────
async function apiFetch(path: string): Promise<any> {
  const key = getApiKey();

  // Bail immediately if no key — don't waste a request
  if (!key) {
    throw new RapidApiException("NO_KEY", "No API key configured");
  }

  const url = `${BASE}${path}`;
  console.log(`📡 API-Sports request: ${url}`);

  let res: Response;
  let data: any;

  try {
    res = await fetch(url, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
    });
  } catch (networkErr) {
    // DNS failure, connection refused, timeout, etc.
    console.error(`❌ Network error fetching ${url}:`, networkErr);
    throw new RapidApiException("API_ERROR", `Network error: ${(networkErr as Error).message}`);
  }

  try {
    data = await res.json();
  } catch (parseErr) {
    console.error(`❌ Failed to parse JSON from ${url} (status ${res.status}):`, parseErr);
    throw new RapidApiException("API_ERROR", `Invalid JSON response (HTTP ${res.status})`);
  }

  // ── HTTP-level errors ─────────────────────────────────────────────────────
  if (res.status === 401 || res.status === 403) {
    console.error(`❌ Auth error (${res.status}) — your API key is invalid or expired:`, data);
    throw new RapidApiException("AUTH_ERROR", `HTTP ${res.status} — check your API key on api-sports.io`);
  }

  if (res.status === 429) {
    console.warn(`⚠️ Rate limited (429) on ${url} — waiting 30s before retry...`);
    await delay(30_000);

    let retry: Response;
    try {
      retry = await fetch(url, {
        headers: { "x-apisports-key": key },
        cache: "no-store",
      });
    } catch (retryErr) {
      throw new RapidApiException("RATE_LIMITED", "Rate limited and retry also failed");
    }

    if (!retry.ok) {
      throw new RapidApiException("RATE_LIMITED", `Rate limit persists after retry (HTTP ${retry.status})`);
    }
    data = await retry.json();
  } else if (!res.ok) {
    console.error(`❌ HTTP ${res.status} from ${url}:`, data);
    throw new RapidApiException("API_ERROR", `HTTP ${res.status}`);
  }

  // ── Application-level errors inside a 200 response ────────────────────────
  if (data?.errors && typeof data.errors === "object" && Object.keys(data.errors).length > 0) {
    const errStr = JSON.stringify(data.errors);
    console.error(`❌ API-Sports returned errors for ${url}:`, errStr);

    if (errStr.toLowerCase().includes("token") || errStr.toLowerCase().includes("key")) {
      throw new RapidApiException("AUTH_ERROR", `Invalid API token: ${errStr}`);
    }
    if (errStr.toLowerCase().includes("limit") || errStr.toLowerCase().includes("request")) {
      throw new RapidApiException("RATE_LIMITED", `Quota exceeded: ${errStr}`);
    }
    // Non-fatal error (e.g. no data for this league/date) — return empty
    return null;
  }

  // ── Warn if response field is missing but don't throw ─────────────────────
  if (!data?.response) {
    console.warn(`⚠️ No "response" field from ${url}. Full data:`, JSON.stringify(data));
    return null;
  }

  // ── Log usage stats if the API returns them ───────────────────────────────
  if (data?.results !== undefined) {
    console.log(`✅ API-Sports ${url} → ${data.results} result(s)`);
  }

  return data;
}

// ── Leagues NOT covered by football-data.org free tier ───────────────────────
// ⚠️  FREE PLAN LIMIT: api-sports.io free tier only allows seasons 2022–2024.
//     All seasons are pinned to 2024 (the latest accessible on free tier).
//     To access 2025/2026 seasons, upgrade at: https://www.api-football.com/pricing
export const RAPIDAPI_LEAGUES = [
  // ── England ───────────────────────────────────────────────────────────────
  { id: 41,  apiId: 41,  name: "EFL League One",          country: "England",       season: 2024 },
  { id: 42,  apiId: 42,  name: "EFL League Two",          country: "England",       season: 2024 },
  { id: 45,  apiId: 45,  name: "FA Cup",                  country: "England",       season: 2024 },
  { id: 48,  apiId: 48,  name: "EFL Cup",                 country: "England",       season: 2024 },

  // ── Europe ────────────────────────────────────────────────────────────────
  { id: 3,   apiId: 3,   name: "UEFA Europa League",      country: "Europe",        season: 2024 },
  { id: 4,   apiId: 4,   name: "UEFA Conference League",  country: "Europe",        season: 2024 },
  { id: 848, apiId: 848, name: "UEFA Nations League",     country: "Europe",        season: 2024 },
  { id: 144, apiId: 144, name: "Belgian Pro League",      country: "Belgium",       season: 2024 },
  { id: 218, apiId: 218, name: "Scottish Premiership",    country: "Scotland",      season: 2024 },
  { id: 203, apiId: 203, name: "Süper Lig",               country: "Turkey",        season: 2024 },
  { id: 271, apiId: 271, name: "Superligaen",             country: "Denmark",       season: 2024 },
  { id: 197, apiId: 197, name: "Super League",            country: "Greece",        season: 2024 },
  { id: 244, apiId: 244, name: "Ekstraklasa",             country: "Poland",        season: 2024 },

  // ── Summer / Calendar Year Leagues ────────────────────────────────────────
  { id: 169, apiId: 169, name: "Eliteserien",             country: "Norway",        season: 2024 },
  { id: 113, apiId: 113, name: "Allsvenskan",             country: "Sweden",        season: 2024 },
  { id: 98,  apiId: 98,  name: "J1 League",               country: "Japan",         season: 2024 },
  { id: 292, apiId: 292, name: "K League 1",              country: "South Korea",   season: 2024 },
  { id: 253, apiId: 253, name: "MLS",                     country: "USA",           season: 2024 },
  { id: 154, apiId: 154, name: "Chinese Super League",    country: "China",         season: 2024 },

  // ── South & Central America ───────────────────────────────────────────────
  { id: 13,  apiId: 13,  name: "Copa Libertadores",       country: "South America", season: 2024 },
  { id: 11,  apiId: 11,  name: "Copa Sudamericana",       country: "South America", season: 2024 },
  { id: 128, apiId: 128, name: "Liga Profesional",        country: "Argentina",     season: 2024 },
  { id: 239, apiId: 239, name: "Liga BetPlay",            country: "Colombia",      season: 2024 },
  { id: 265, apiId: 265, name: "Primera División",        country: "Chile",         season: 2024 },
  { id: 268, apiId: 268, name: "LigaPro",                 country: "Ecuador",       season: 2024 },
  { id: 262, apiId: 262, name: "Liga MX",                 country: "Mexico",        season: 2024 },
  { id: 26,  apiId: 26,  name: "CONCACAF Champions Cup",  country: "CONCACAF",      season: 2024 },

  // ── Africa & Middle East ──────────────────────────────────────────────────
  { id: 288, apiId: 288, name: "Premier Soccer League",   country: "South Africa",  season: 2024 },
  { id: 307, apiId: 307, name: "Saudi Pro League",        country: "Saudi Arabia",  season: 2024 },
  { id: 200, apiId: 200, name: "Egyptian Premier League", country: "Egypt",         season: 2024 },
  { id: 20,  apiId: 20,  name: "CAF Champions League",    country: "Africa",        season: 2024 },
];

// ── Status mapper ─────────────────────────────────────────────────────────────
export function mapRapidStatus(short: string): string {
  const m: Record<string, string> = {
    NS:   "SCHEDULED", TBD:  "SCHEDULED",
    "1H": "LIVE",      HT:   "HT",       "2H": "LIVE",
    ET:   "LIVE",      P:    "LIVE",      FT:   "FT",
    AET:  "FT",        PEN:  "FT",
    PST:  "POSTPONED", CANC: "CANCELLED",
    SUSP: "CANCELLED", LIVE: "LIVE",
    ABD:  "CANCELLED", AWD:  "FT",       WO:   "FT",
  };
  return m[short] ?? "SCHEDULED";
}

// ── Normalise fixture ─────────────────────────────────────────────────────────
export function normaliseRapidMatch(item: any, leagueId: number) {
  return {
    fixture: {
      id:     item?.fixture?.id,
      date:   item?.fixture?.date,
      status: {
        short:   item?.fixture?.status?.short ?? "NS",
        elapsed: item?.fixture?.status?.elapsed ?? null,
      },
      venue: { name: item?.fixture?.venue?.name ?? null },
    },
    league: {
      id:     leagueId,
      season: item?.league?.season,
    },
    teams: {
      home: {
        id:   item?.teams?.home?.id ?? 0,
        name: item?.teams?.home?.name ?? "TBD",
        logo: item?.teams?.home?.logo ?? "",
      },
      away: {
        id:   item?.teams?.away?.id ?? 0,
        name: item?.teams?.away?.name ?? "TBD",
        logo: item?.teams?.away?.logo ?? "",
      },
    },
    goals: {
      home: item?.goals?.home ?? null,
      away: item?.goals?.away ?? null,
    },
    _goals: (item?.events ?? [])
      .filter((e: any) => e?.type === "Goal")
      .map((e: any) => ({
        type:   "Goal",
        time:   { elapsed: e?.time?.elapsed ?? 0 },
        player: { name: e?.player?.name ?? "Unknown" },
        assist: { name: e?.assist?.name ?? null },
        team:   { id: e?.team?.id ?? 0 },
        detail: e?.detail ?? "Normal Goal",
      })),
  };
}

// ── Normalise standings row ───────────────────────────────────────────────────
export function normaliseRapidStanding(row: any) {
  return {
    team:   { id: row?.team?.id, name: row?.team?.name, logo: row?.team?.logo ?? "" },
    rank:   row?.rank,
    form:   (row?.form ?? "").replace(/[,\s]/g, ""),
    points: row?.points ?? 0,
    all: {
      played: row?.all?.played ?? 0,
      win:    row?.all?.win ?? 0,
      draw:   row?.all?.draw ?? 0,
      lose:   row?.all?.lose ?? 0,
      goals:  {
        for:     row?.all?.goals?.for ?? 0,
        against: row?.all?.goals?.against ?? 0,
      },
    },
  };
}

// ── Fetch fixtures for a specific date ───────────────────────────────────────
export async function fetchRapidFixtures(
  leagueId: number,
  season: number,
  date: string
): Promise<any[]> {
  await delay(1200);
  try {
    const data = await apiFetch(`/fixtures?league=${leagueId}&season=${season}&date=${date}`);
    return data?.response ?? [];
  } catch (e) {
    console.error(`❌ fetchRapidFixtures failed [league=${leagueId} season=${season} date=${date}]:`, e);
    return [];
  }
}

// ── Fetch fixtures for a date range ──────────────────────────────────────────
export async function fetchRapidFixturesRange(
  leagueId: number,
  season: number,
  from: string,
  to: string
): Promise<any[]> {
  await delay(1200);
  try {
    const data = await apiFetch(`/fixtures?league=${leagueId}&season=${season}&from=${from}&to=${to}`);
    return data?.response ?? [];
  } catch (e) {
    console.error(`❌ fetchRapidFixturesRange failed [league=${leagueId} season=${season} from=${from} to=${to}]:`, e);
    return [];
  }
}

// ── Fetch standings ───────────────────────────────────────────────────────────
export async function fetchRapidStandings(
  leagueId: number,
  season: number
): Promise<any[]> {
  await delay(1200);
  try {
    const data = await apiFetch(`/standings?league=${leagueId}&season=${season}`);
    return data?.response?.[0]?.league?.standings?.[0] ?? [];
  } catch (e) {
    console.error(`❌ fetchRapidStandings failed [league=${leagueId} season=${season}]:`, e);
    return [];
  }
}

// ── Fetch all live matches ────────────────────────────────────────────────────
export async function fetchRapidLive(): Promise<any[]> {
  try {
    const data = await apiFetch(`/fixtures?live=all`);
    return data?.response ?? [];
  } catch (e) {
    console.error(`❌ fetchRapidLive failed:`, e);
    return [];
  }
}
