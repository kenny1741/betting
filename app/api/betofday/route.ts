import { NextResponse } from "next/server";
import { format } from "date-fns";
import {
  LEAGUES,
  getCurrentSeason,
  fetchFixtures,
  normaliseFDOMatch,
} from "@/lib/api-football";
import { buildPrediction } from "@/lib/prediction";

export const dynamic = "force-dynamic";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET() {
  const today  = format(new Date(), "yyyy-MM-dd");
  const season = getCurrentSeason();

  // Top 6 leagues only to keep response fast
  const topLeagues = LEAGUES.slice(0, 6);
  const all: any[] = [];

  for (const league of topLeagues) {
    try {
      const rawFixtures = await fetchFixtures(league.id, season, today);
      for (const raw of rawFixtures) {
        const norm     = normaliseFDOMatch(raw, league.id);
        const homeTeam = { id: norm.teams.home.id, name: norm.teams.home.name, logo: norm.teams.home.logo };
        const awayTeam = { id: norm.teams.away.id, name: norm.teams.away.name, logo: norm.teams.away.logo };
        const pred     = buildPrediction(homeTeam, awayTeam);

        all.push({
          id:         String(norm.fixture.id),
          kickoff:    norm.fixture.date,
          status:     norm.fixture.status.short,
          homeTeam,
          awayTeam,
          prediction: pred,
        });
      }
    } catch (e) {
      console.error(`betofday: fetch failed (${league.name}):`, e);
    }
    await delay(8000);
  }

  const picks = all
    .filter(m => m.status === "NS" && m.prediction.confidence >= 50)
    .sort((a, b) => b.prediction.confidence - a.prediction.confidence)
    .slice(0, 3);

  return NextResponse.json({ picks });
}