import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClassroomLog, awardXp, checkAndAwardAchievements } from "@/lib/db/calla";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { techniqueName, durationMinutes, isMannequin, photoUrls, selfAssessment, notes } = body;

    if (!techniqueName?.trim()) {
      return NextResponse.json({ error: "techniqueName is required" }, { status: 400 });
    }

    const log = await createClassroomLog(user.id, {
      techniqueName,
      durationMinutes,
      isMannequin,
      photoUrls,
      selfAssessment,
      notes,
    });

    if (!log) {
      return NextResponse.json({ error: "Failed to create classroom log" }, { status: 500 });
    }

    const xp = await awardXp(user.id, "classroom_log", 30, log.id);
    const newAchievements = await checkAndAwardAchievements(user.id);

    return NextResponse.json({ log, xp, newAchievements });
  } catch (err) {
    console.error("Classroom log route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
