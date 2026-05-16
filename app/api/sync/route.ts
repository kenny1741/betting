import { NextRequest, NextResponse } from "next/server";
import { runSync, ALL_LEAGUES } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader  = req.headers.get("Authorization");
  const cronSecret  = process.env.CRON_SECRET;
  const secret      = req.nextUrl.searchParams.get("secret");
  const type        = (req.nextUrl.searchParams.get("type") ?? "today") as any;
  const leagueIndex = parseInt(req.nextUrl.searchParams.get("league") ?? "0", 10);

  // Vercel cron sends Authorization: Bearer CRON_SECRET automatically
  const validCron   = cronSecret && authHeader === `Bearer ${cronSecret}`;
  // Manual trigger from admin page uses ?secret= param
  const validManual = secret && secret === process.env.SYNC_SECRET;

  if (!validCron && !validManual) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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