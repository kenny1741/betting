import { NextRequest, NextResponse } from "next/server";
import { getTodayMatches, getTomorrowMatches, getUpcomingMatches } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab") ?? "today";

  let matches;
  if (tab === "tomorrow")      matches = await getTomorrowMatches();
  else if (tab === "upcoming") matches = await getUpcomingMatches();
  else                         matches = await getTodayMatches();

  return NextResponse.json({ matches, count: matches.length });
}