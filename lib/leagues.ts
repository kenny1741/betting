export interface LeagueConfig {
  apiId: string; // Changed from number to string for Football-Data.org
  name: string;
  country: string;
  region: "EUROPE" | "AFRICA" | "ASIA" | "SOUTH_AMERICA" | "CONCACAF" | "OTHER";
  season: number;
}

const THIS_YEAR = new Date().getFullYear();
// Football-Data.org uses the starting year (e.g., 2025 for the 25/26 season)
const EU_SEASON = new Date().getMonth() >= 7 ? THIS_YEAR : THIS_YEAR - 1;

/**
 * Football-Data.org FREE TIER LEAGUES
 * These are the codes used by their v4 API.
 * Note: Their free tier is highly focused on Europe and Brazil.
 */
export const GLOBAL_LEAGUES: LeagueConfig[] = [
  // ── EUROPE (Free Tier Available) ──────────────────────────────────────────
  { apiId: "PL",  name: "Premier League",    country: "England",      region: "EUROPE",        season: EU_SEASON },
  { apiId: "PD",  name: "La Liga",           country: "Spain",        region: "EUROPE",        season: EU_SEASON },
  { apiId: "SA",  name: "Serie A",           country: "Italy",        region: "EUROPE",        season: EU_SEASON },
  { apiId: "BL1", name: "Bundesliga",        country: "Germany",      region: "EUROPE",        season: EU_SEASON },
  { apiId: "FL1", name: "Ligue 1",           country: "France",       region: "EUROPE",        season: EU_SEASON },
  { apiId: "CL",  name: "Champions League",  country: "Europe",       region: "EUROPE",        season: EU_SEASON },
  { apiId: "DED", name: "Eredivisie",        country: "Netherlands",  region: "EUROPE",        season: EU_SEASON },
  { apiId: "PPL", name: "Primeira Liga",     country: "Portugal",     region: "EUROPE",        season: EU_SEASON },
  
  // ── SOUTH AMERICA (Free Tier Available) ───────────────────────────────────
  { apiId: "BSA", name: "Brasileirão Série A", country: "Brazil",     region: "SOUTH_AMERICA", season: THIS_YEAR },

  // ── OTHER (Note: Football-Data free tier has limited African/Asian coverage) ──
  // For leagues not in the free tier, the API might return an error. 
  // It is best to stick to the codes above for your live dashboard.
];

// Priority groups — These are all available on the Football-Data.org Free Tier
export const PRIORITY_LEAGUES = GLOBAL_LEAGUES.filter(l =>
  ["PL", "PD", "SA", "BL1", "FL1", "CL", "BSA"].includes(l.apiId)
);

export const ALL_LEAGUE_IDS = GLOBAL_LEAGUES.map(l => l.apiId);



/*export interface LeagueConfig {
  apiId: number;
  name: string;
  country: string;
  region: "EUROPE" | "AFRICA" | "ASIA" | "SOUTH_AMERICA" | "CONCACAF" | "OTHER";
  season: number;        // current season year
}

const THIS_YEAR = new Date().getFullYear();
const EU_SEASON = new Date().getMonth() >= 7 ? THIS_YEAR : THIS_YEAR - 1;

// All fetched via API-Football (RapidAPI) — 100 free req/day
// We batch smartly to stay within quota
export const GLOBAL_LEAGUES: LeagueConfig[] = [
  // ── EUROPE ──────────────────────────────────────────────────────────────
  { apiId: 39,  name: "Premier League",      country: "England",       region: "EUROPE",        season: EU_SEASON },
  { apiId: 140, name: "La Liga",             country: "Spain",         region: "EUROPE",        season: EU_SEASON },
  { apiId: 135, name: "Serie A",             country: "Italy",         region: "EUROPE",        season: EU_SEASON },
  { apiId: 78,  name: "Bundesliga",          country: "Germany",       region: "EUROPE",        season: EU_SEASON },
  { apiId: 61,  name: "Ligue 1",             country: "France",        region: "EUROPE",        season: EU_SEASON },
  { apiId: 2,   name: "Champions League",    country: "Europe",        region: "EUROPE",        season: EU_SEASON },
  { apiId: 3,   name: "Europa League",       country: "Europe",        region: "EUROPE",        season: EU_SEASON },
  { apiId: 88,  name: "Eredivisie",          country: "Netherlands",   region: "EUROPE",        season: EU_SEASON },
  { apiId: 94,  name: "Primeira Liga",       country: "Portugal",      region: "EUROPE",        season: EU_SEASON },
  { apiId: 144, name: "Pro League",          country: "Belgium",       region: "EUROPE",        season: EU_SEASON },
  // ── AFRICA ───────────────────────────────────────────────────────────────
  { apiId: 12,  name: "Africa Cup of Nations", country: "Africa",      region: "AFRICA",        season: THIS_YEAR },
  { apiId: 20,  name: "CAF Champions League",  country: "Africa",      region: "AFRICA",        season: THIS_YEAR },
  { apiId: 288, name: "Premier Soccer League", country: "South Africa",region: "AFRICA",        season: THIS_YEAR },
  { apiId: 665, name: "Nigeria Premier League",country: "Nigeria",     region: "AFRICA",        season: THIS_YEAR },
  { apiId: 367, name: "Ghana Premier League",  country: "Ghana",       region: "AFRICA",        season: THIS_YEAR },
  { apiId: 682, name: "Kenyan Premier League", country: "Kenya",       region: "AFRICA",        season: THIS_YEAR },
  { apiId: 200, name: "Egyptian Premier League",country: "Egypt",      region: "AFRICA",        season: THIS_YEAR },
  { apiId: 203, name: "Botola Pro",           country: "Morocco",      region: "AFRICA",        season: THIS_YEAR },
  // ── ASIA ─────────────────────────────────────────────────────────────────
  { apiId: 17,  name: "AFC Champions League", country: "Asia",         region: "ASIA",          season: THIS_YEAR },
  { apiId: 98,  name: "J-League",             country: "Japan",        region: "ASIA",          season: THIS_YEAR },
  { apiId: 169, name: "K League 1",           country: "South Korea",  region: "ASIA",          season: THIS_YEAR },
  { apiId: 154, name: "Chinese Super League", country: "China",        region: "ASIA",          season: THIS_YEAR },
  { apiId: 307, name: "Saudi Pro League",     country: "Saudi Arabia", region: "ASIA",          season: THIS_YEAR },
  { apiId: 332, name: "UAE Pro League",       country: "UAE",          region: "ASIA",          season: THIS_YEAR },
  // ── SOUTH AMERICA ────────────────────────────────────────────────────────
  { apiId: 13,  name: "Copa Libertadores",    country: "South America",region: "SOUTH_AMERICA", season: THIS_YEAR },
  { apiId: 71,  name: "Brasileirão Série A",  country: "Brazil",       region: "SOUTH_AMERICA", season: THIS_YEAR },
  { apiId: 128, name: "Liga Profesional",     country: "Argentina",    region: "SOUTH_AMERICA", season: THIS_YEAR },
  { apiId: 239, name: "Liga BetPlay",         country: "Colombia",     region: "SOUTH_AMERICA", season: THIS_YEAR },
  { apiId: 265, name: "Primera División",     country: "Chile",        region: "SOUTH_AMERICA", season: THIS_YEAR },
  // ── CONCACAF ─────────────────────────────────────────────────────────────
  { apiId: 253, name: "MLS",                  country: "USA",          region: "CONCACAF",      season: THIS_YEAR },
  { apiId: 262, name: "Liga MX",              country: "Mexico",       region: "CONCACAF",      season: THIS_YEAR },
];

// Priority groups — we fetch these first to stay within daily quota
export const PRIORITY_LEAGUES = GLOBAL_LEAGUES.filter(l =>
  [39, 140, 135, 78, 61, 2, 71, 128, 253, 307, 98, 288].includes(l.apiId)
);

export const ALL_LEAGUE_IDS = GLOBAL_LEAGUES.map(l => l.apiId);
*/