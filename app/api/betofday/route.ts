import { NextResponse } from "next/server";
import { format } from "date-fns";
import { fetchFixtures } from "@/lib/api-football"; // 1. Fixed name
import { GLOBAL_LEAGUES } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");

  // Filter for the big leagues we want to check
  const topLeagues = GLOBAL_LEAGUES.filter((l) =>
    [39, 140, 135, 78, 61, 2, 71, 128, 253, 307].includes(Number(l.apiId))
  ).slice(0, 6);

  try {
    // 2. We must loop through the leagues because fetchFixtures 
    // now needs (apiId, season, date)
    const results = await Promise.allSettled(
      topLeagues.map((l) => fetchFixtures(Number(l.apiId), Number(l.season), today))
    );

    // 3. Flatten the results into one single array of matches
    const all = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value || []);

    // Filter scheduled matches and sort by confidence
    const picks = all
      .filter(
        (m: any) =>
          m.status === "SCHEDULED" &&
          (m.prediction?.confidence ?? 0) >= 50
      )
      .sort(
        (a: any, b: any) =>
          (b.prediction?.confidence ?? 0) - (a.prediction?.confidence ?? 0)
      )
      .slice(0, 3);

    return NextResponse.json({ picks });
  } catch (error) {
    console.error("Bet of day error:", error);
    return NextResponse.json({ picks: [] });
  }
}