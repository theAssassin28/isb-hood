import { NextResponse, type NextRequest } from "next/server";
import { runDaily } from "@/lib/jobs/daily";

// Called once a day by Vercel Cron (vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set; anything else
// is refused, so the job cannot be triggered by a stranger.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runDaily(new Date());
  console.info("[cron] daily", summary);
  return NextResponse.json({ ok: true, ...summary });
}
