import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProgression, getTopicPerformance } from "@/lib/db/calla";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();

    const [progression, performance, sessionsRes] = await Promise.all([
      getProgression(user.id),
      getTopicPerformance(user.id),
      admin
        .from("calla_study_sessions")
        .select("id, duration_minutes")
        .eq("user_id", user.id),
    ]);

    const sessions = sessionsRes.data ?? [];
    const totalSessions = sessions.length;
    const totalStudyMinutes = sessions.reduce(
      (sum: number, s: Record<string, unknown>) => sum + ((s.duration_minutes as number) || 0),
      0
    );

    return NextResponse.json({
      progression,
      performance,
      summary: { totalSessions, totalStudyMinutes },
    });
  } catch (err) {
    console.error("Stats route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
