import { NextRequest, NextResponse } from "next/server";
import { format, addDays } from "date-fns";
import {
  LEAGUES,
  getCurrentSeason,
  fetchFixtures,
  fetchFixturesRange,
  normaliseFDOMatch,
} from "@/lib/api-football";
import { buildPrediction } from "@/lib/prediction";
import type { Match } from "@/types";

export const dynamic = "force-dynamic";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const tab    = req.nextUrl.searchParams.get("tab") ?? "today";
  const region = req.nextUrl.searchParams.get("region") ?? "";

  if (!process.env.FOOTBALL_DATA_API_KEY) {
    return NextResponse.json({
      matches: [],
      count:   0,
      error:   "FOOTBALL_DATA_API_KEY not configured. Add it to .env.local",
    });
  }

  const now          = new Date();
  const season       = getCurrentSeason();
  const todayStr     = format(now, "yyyy-MM-dd");
  const tomorrowStr  = format(addDays(now, 1), "yyyy-MM-dd");
  const upcomingFrom = format(addDays(now, 2), "yyyy-MM-dd");
  const upcomingTo   = format(addDays(now, 7), "yyyy-MM-dd");

  const REGION_COUNTRIES: Record<string, string[]> = {
    EUROPE:        ["England", "Spain", "Italy", "Germany", "France", "Portugal", "Netherlands"],
    SOUTH_AMERICA: ["Brazil"],
  };
  const allowedCountries = region ? (REGION_COUNTRIES[region] ?? []) : [];
  const leagues = (
    allowedCountries.length
      ? LEAGUES.filter(l => allowedCountries.includes(l.country))
      : LEAGUES
  ).slice(0, 8);

  console.log(`Fetching [${tab}] for ${leagues.length} leagues: ${leagues.map(l => l.name).join(", ")}`);

  const all: Match[] = [];
  let errors = 0;

  for (const league of leagues) {
    try {
      let rawFixtures: any[] = [];

      if (tab === "tomorrow") {
        rawFixtures = await fetchFixtures(league.id, season, tomorrowStr);
      } else if (tab === "upcoming") {
        rawFixtures = await fetchFixturesRange(league.id, season, upcomingFrom, upcomingTo);
      } else {
        rawFixtures = await fetchFixtures(league.id, season, todayStr);
      }

      for (const raw of rawFixtures) {
        const norm     = normaliseFDOMatch(raw, league.id);
        const homeTeam = { id: norm.teams.home.id, name: norm.teams.home.name, logo: norm.teams.home.logo };
        const awayTeam = { id: norm.teams.away.id, name: norm.teams.away.name, logo: norm.teams.away.logo };
        const pred     = buildPrediction(homeTeam, awayTeam);

        all.push({
          id:            String(norm.fixture.id),
          kickoff:       norm.fixture.date,
          status:        norm.fixture.status.short,
          minute:        norm.fixture.status.elapsed ?? null,
          homeScore:     norm.goals.home ?? null,
          awayScore:     norm.goals.away ?? null,
          venue:         norm.fixture.venue?.name ?? null,
          homeTeam,
          awayTeam,
          goals:         norm._goals ?? [],
          leagueId:      league.id,
          leagueName:    league.name,
          leagueLogo:    league.logo,
          leagueCountry: league.country,
          season,
          syncedAt:      new Date().toISOString(),
          prediction:    pred,
        } as unknown as Match);
      }
    } catch (e) {
      errors++;
      console.error(`League fetch failed (${league.name}):`, e);
    }

    await delay(8000);
  }

  all.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  const seen   = new Set<number>();
  const unique = all.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  console.log(`✅ Returning ${unique.length} matches (${errors} errors)`);

  return NextResponse.json({
    matches: unique,
    count:   unique.length,
    errors,
    date:    todayStr,
  });
}