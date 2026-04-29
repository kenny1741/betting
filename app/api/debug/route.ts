import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rapidKey = process.env.RAPIDAPI_KEY ?? "";
  const fdoKey   = process.env.FOOTBALL_DATA_API_KEY ?? "";

  const hasRapid = rapidKey.length > 10 && rapidKey !== "your_rapidapi_key_here";
  const hasFDO   = fdoKey.length > 10 && fdoKey !== "your_key_here";

  let rapidTest: any = null;
  let rapidError: string | null = null;

  if (hasRapid) {
    try {
      // Test with Premier League fixtures — a league that definitely exists
      const res = await fetch(
        "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=39&season=2024&last=1",
        {
          headers: {
            "X-RapidAPI-Key":  rapidKey,
            "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
          },
          cache: "no-store",
        }
      );

      const remaining = res.headers.get("x-ratelimit-requests-remaining");
      const used      = res.headers.get("x-ratelimit-requests-used");
      const body      = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(body); } catch {}

      rapidTest = {
        httpStatus:  res.status,
        ok:          res.ok,
        quotaRemaining: remaining,
        quotaUsed:   used,
        results:     parsed?.results ?? null,
        errors:      parsed?.errors  ?? null,
        rawBody:     res.ok ? null : body.slice(0, 300),
      };
    } catch (e: any) {
      rapidError = e?.message ?? "Network error";
    }
  }

  return NextResponse.json({
    env: {
      RAPIDAPI_KEY:           hasRapid ? `✅ SET (${rapidKey.slice(0, 8)}...)` : "❌ NOT SET",
      FOOTBALL_DATA_API_KEY:  hasFDO   ? `✅ SET (${fdoKey.slice(0, 6)}...)`   : "❌ NOT SET",
      SUPABASE_URL:           process.env.NEXT_PUBLIC_SUPABASE_URL           ? "✅ SET" : "❌ NOT SET",
      SYNC_SECRET:            process.env.SYNC_SECRET                        ? "✅ SET" : "❌ NOT SET",
    },
    rapidApiTest: rapidTest,
    rapidApiError: rapidError,
    diagnosis: !hasRapid
      ? "❌ RAPIDAPI_KEY not set in .env.local"
      : rapidTest?.httpStatus === 403
        ? "❌ 403 Forbidden — key is wrong OR you haven't subscribed on RapidAPI. Go to rapidapi.com → find 'API-Football' → click Subscribe → Basic (free)"
        : rapidTest?.errors && JSON.stringify(rapidTest.errors).includes("subscribe")
          ? "❌ Not subscribed — go to rapidapi.com and subscribe to API-Football Basic plan"
          : rapidTest?.ok && rapidTest?.results !== null
            ? "✅ RapidAPI key is working correctly"
            : "⚠️ Unexpected response — check rawBody above",
  });
}
