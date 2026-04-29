import { NextRequest, NextResponse } from "next/server";
import { runSync, ALL_LEAGUES } from "@/lib/sync";

export const dynamic = "force-dynamic";
// NO maxDuration — keep default (10s on hobby, 60s on pro)

export async function GET(req: NextRequest) {
  const secret      = req.nextUrl.searchParams.get("secret");
  const type        = (req.nextUrl.searchParams.get("type") ?? "today") as any;
  const leagueIndex = parseInt(req.nextUrl.searchParams.get("league") ?? "0", 10);

  if (!process.env.SYNC_SECRET || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // "all" type — return the full combined league list so the admin UI can build cron entries
  if (type === "all") {
    return NextResponse.json({
      success: true,
      total:   ALL_LEAGUES.length,
      leagues: ALL_LEAGUES.map((l, i) => ({
        index:  i,
        name:   l.name,
        id:     l.id,
        source: l.source,
        country: l.country,
      })),
    });
  }

  try {
    const result = await runSync(type, leagueIndex);
    return NextResponse.json(result ?? { success: false, error: "Empty result" });
  } catch (e: any) {
    console.error("Sync route crash:", e);
    return NextResponse.json(
      { success: false, error: e?.message ?? "Sync failed" },
      { status: 500 }
    );
  }
}
