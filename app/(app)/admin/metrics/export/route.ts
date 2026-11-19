import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildReport, reportCsv, type Snapshot } from "@/lib/domain/metrics";
import { createClient } from "@/lib/supabase/server";

// CSV downloads for the course write-up (plan 8.2). Moderators only. Survey
// answers are exported without names, emails or user ids.

const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function csvResponse(body: string, name: string) {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "moderator") {
    return new NextResponse("Not found", { status: 404 });
  }
  const supabase = await createClient();
  const day = new Date().toISOString().slice(0, 10);

  if (request.nextUrl.searchParams.get("kind") === "surveys") {
    const [{ data: answers, error }, { data: courses }] = await Promise.all([
      supabase
        .from("survey_responses")
        .select(
          "survey, bid_effect, changed_course_ids, seniors_asked_band, career_action, action_text, note, days_since_first_view, created_at",
        )
        .order("created_at")
        .returns<
          {
            survey: string;
            bid_effect: string | null;
            changed_course_ids: string[] | null;
            seniors_asked_band: string | null;
            career_action: string | null;
            action_text: string | null;
            note: string | null;
            days_since_first_view: number | null;
            created_at: string;
          }[]
        >(),
      supabase.from("courses").select("id, code").returns<{ id: string; code: string }[]>(),
    ]);
    if (error) return new NextResponse("Could not read survey answers", { status: 500 });
    const code = new Map((courses ?? []).map((c) => [c.id, c.code]));
    const header = [
      "survey",
      "bid_effect",
      "changed_courses",
      "seniors_asked",
      "career_action",
      "action_text",
      "note",
      "days_since_first_career_view",
      "answered_at",
    ];
    const lines = (answers ?? []).map((a) =>
      [
        a.survey,
        a.bid_effect,
        (a.changed_course_ids ?? []).map((id) => code.get(id) ?? id).join(" "),
        a.seniors_asked_band,
        a.career_action,
        a.action_text,
        a.note,
        a.days_since_first_view,
        a.created_at,
      ]
        .map(cell)
        .join(","),
    );
    return csvResponse(
      [header.map(cell).join(","), ...lines].join("\n") + "\n",
      `isb-hood-survey-answers-${day}.csv`,
    );
  }

  const { data, error } = await supabase.rpc("metrics_snapshot");
  if (error || !data) return new NextResponse("Could not compute metrics", { status: 500 });
  return csvResponse(reportCsv(buildReport(data as Snapshot)), `isb-hood-metrics-${day}.csv`);
}
