// The Odds API client
// Free tier: 500 requests/month
// Only fetches match result (h2h) odds — fully confirmed for soccer free tier

const BASE = "https://api.the-odds-api.com/v4";

// Soccer sport keys on The Odds API
const SPORT_KEYS: Record<string, string> = {
  "Premier League":    "soccer_england_league1",
  "La Liga":           "soccer_spain_la_liga",
  "Serie A":           "soccer_italy_serie_a",
  "Bundesliga":        "soccer_germany_bundesliga",
  "Ligue 1":           "soccer_france_ligue_one",
  "Primeira Liga":     "soccer_portugal_primeira_liga",
  "Eredivisie":        "soccer_netherlands_eredivisie",
  "Brasileirão Série A": "soccer_brazil_campeonato",
};

interface MatchOdds {
  home: number;   // decimal odds e.g. 1.85
  draw: number;
  away: number;
  bookmaker: string;
}

// Normalise team name for fuzzy matching
function norm(name: string) {
  return name.toLowerCase()
    .replace(/\bfc\b/g, "")
    .replace(/\baf\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Find the best odds match for a given match
function findMatchOdds(
  events: any[],
  homeTeam: string,
  awayTeam: string
): MatchOdds | null {
  const normHome = norm(homeTeam);
  const normAway = norm(awayTeam);

  for (const event of events) {
    const eHome = norm(event.home_team ?? "");
    const eAway = norm(event.away_team ?? "");

    // Check if team names match (allow partial match for long names)
    const homeMatch = eHome.includes(normHome) || normHome.includes(eHome);
    const awayMatch = eAway.includes(normAway) || normAway.includes(eAway);

    if (!homeMatch || !awayMatch) continue;

    // Found the match — extract odds from first available bookmaker
    for (const bookmaker of (event.bookmakers ?? [])) {
      const h2h = bookmaker.markets?.find((m: any) => m.key === "h2h");
      if (!h2h) continue;

      const homeOdds = h2h.outcomes?.find((o: any) => norm(o.name) === eHome)?.price;
      const drawOdds = h2h.outcomes?.find((o: any) => o.name === "Draw")?.price;
      const awayOdds = h2h.outcomes?.find((o: any) => norm(o.name) === eAway)?.price;

      if (homeOdds && drawOdds && awayOdds) {
        return {
          home:      homeOdds,
          draw:      drawOdds,
          away:      awayOdds,
          bookmaker: bookmaker.title ?? "Unknown",
        };
      }
    }
  }
  return null;
}

// Cache to avoid hitting the API repeatedly for the same league+day
const oddsCache = new Map<string, { data: any[]; exp: number }>();

export async function fetchMatchOdds(
  homeTeam: string,
  awayTeam: string,
  kickoff: string,
  leagueName?: string
): Promise<MatchOdds | null> {
  const key = process.env.ODDS_API_KEY;
  if (!key) return null;

  // Find sport key for this league
  const sportKey = leagueName
    ? SPORT_KEYS[leagueName]
    : Object.values(SPORT_KEYS)[0];

  if (!sportKey) return null;

  const cacheKey = `${sportKey}-${kickoff.slice(0, 10)}`;
  const now = Date.now();
  const cached = oddsCache.get(cacheKey);

  // Return cached data if fresh (cache for 2 hours)
  if (cached && cached.exp > now) {
    return findMatchOdds(cached.data, homeTeam, awayTeam);
  }

  try {
    const url = `${BASE}/sports/${sportKey}/odds?apiKey=${key}&regions=eu&markets=h2h&oddsFormat=decimal`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error(`Odds API error ${res.status} for ${sportKey}`);
      // Log remaining quota from headers
      const remaining = res.headers.get("x-requests-remaining");
      if (remaining) console.log(`Odds API requests remaining: ${remaining}`);
      return null;
    }

    // Log remaining quota
    const remaining = res.headers.get("x-requests-remaining");
    const used = res.headers.get("x-requests-used");
    console.log(`Odds API: ${used} used, ${remaining} remaining this month`);

    const data = await res.json();
    oddsCache.set(cacheKey, { data, exp: now + 2 * 60 * 60 * 1000 }); // 2 hour cache

    return findMatchOdds(data, homeTeam, awayTeam);
  } catch (e) {
    console.error("fetchMatchOdds error:", e);
    return null;
  }
}
