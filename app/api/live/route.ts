import { NextResponse } from "next/server";
import { getLiveMatches } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const matches = await getLiveMatches();
  return NextResponse.json({ matches, count: matches.length, updatedAt: new Date().toISOString() });
}
