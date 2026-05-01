import { NextResponse } from "next/server";
import { format } from "date-fns";
import { fetchFixturesByDate } from "@/lib/api-football";
import { GLOBAL_LEAGUES } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch top leagues only
  const topLeagues = GLOBAL_LEAGUES.filter((l) =>
    [39, 140, 135, 78, 61, 2, 71, 128, 253, 307].includes(Number(l.apiId))
  ).slice(0, 6);

  const all = (await fetchFixturesByDate(today)) ?? [];

  // Filter scheduled matches only and sort by confidence
  const picks = all
    .filter(
      (m: any) =>
        m.status === "SCHEDULED" &&
        (m.prediction?.confidence ?? 0) >= 50
    )
    .sort(
      (a: any, b: any) =>
        (b.prediction?.confidence ?? 0) -
        (a.prediction?.confidence ?? 0)
    )
    .slice(0, 3);

  return NextResponse.json({ picks });
}