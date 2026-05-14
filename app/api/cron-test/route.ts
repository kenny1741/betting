// app/api/cron-test/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Lightweight cron health-check endpoint.
// Schedule: every minute ("* * * * *") via vercel.json
// DELETE this file once you've confirmed crons are working.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const firedAt = new Date().toISOString();
  console.log(`✅ cron-test fired at ${firedAt}`);

  // Write a row to sync_log so you can see it in Supabase
  try {
    const db = getServiceClient();
    await db.from("sync_log").insert({
      sync_type: "cron-test",
      status:    "success",
      records:   0,
      message:   `Cron test fired at ${firedAt}`,
    });
  } catch (e: any) {
    console.error("cron-test log error:", e?.message);
  }

  return NextResponse.json({ ok: true, firedAt });
}
