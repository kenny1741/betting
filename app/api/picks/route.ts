import { NextResponse } from "next/server";
import { getTopPicks } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const picks = await getTopPicks();
  return NextResponse.json({ picks });
}
