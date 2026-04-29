import { NextRequest, NextResponse } from "next/server";
import { format, addDays } from "date-fns";
import { GLOBAL_LEAGUES } from "@/lib/leagues";
import { fetchFixturesByDate, fetchFixturesRange } from "@/lib/api-football";
//import { fetchFixturesByDate, fetchFixturesByRange } from "@/lib/api-football";
import type { Match } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tab    = req.nextUrl.searchParams.get("tab") ?? "today";
  const region = req.nextUrl.searchParams.get("region") ?? "";

  const now          = new Date();
  const todayStr     = format(now, "yyyy-MM-dd");
  const tomorrowStr  = format(addDays(now, 1), "yyyy-MM-dd");
  const upcomingFrom = format(addDays(now, 2), "yyyy-MM-dd");
  const upcomingTo   = format(addDays(now, 7), "yyyy-MM-dd");

  // Check API key
  if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === "your_rapidapi_key_here") {
    console.error("❌ RAPIDAPI_KEY not set in .env.local");
    return NextResponse.json({ 
      matches: [], 
      count: 0,
      error: "RAPIDAPI_KEY not configured. Add it to .env.local",
      debug: true
    });
  }

  // Filter leagues - only fetch leagues with matches likely today
  // Limit to 6 leagues to stay within 100 req/day quota
  // (each league = 1 req for fixtures + 1 req for standings = 2 reqs)
  let leagues = region
    ? GLOBAL_LEAGUES.filter(l => l.region === region)
    : GLOBAL_LEAGUES;

  // Priority: top leagues first
  const PRIORITY = [39, 140, 135, 78, 61, 2, 71, 128, 307, 253, 98, 288];
  leagues = [
    ...leagues.filter(l => PRIORITY.includes(l.apiId)),
    ...leagues.filter(l => !PRIORITY.includes(l.apiId)),
  ].slice(0, 8); // max 8 leagues per request

  console.log(`Fetching ${tab} matches for ${leagues.length} leagues: ${leagues.map(l => l.name).join(", ")}`);

  const all: Match[] = [];

  const results = await Promise.allSettled(
    leagues.map(league => {
      if (tab === "tomorrow") {
        return fetchFixturesByDate(league, tomorrowStr);
      } else if (tab === "upcoming") {
        return fetchFixturesByRange(league, upcomingFrom, upcomingTo);
      } else {
        return fetchFixturesByDate(league, todayStr);
      }
    })
  );

  let errors = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      errors++;
      console.error("League fetch failed:", r.reason);
    }
  }

  // Sort by kickoff
  all.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  // Deduplicate
  const seen = new Set<string>();
  const unique = all.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  console.log(`✅ Returning ${unique.length} matches (${errors} league errors)`);

  return NextResponse.json({ 
    matches: unique, 
    count: unique.length,
    errors,
    date: todayStr,
  });
}
