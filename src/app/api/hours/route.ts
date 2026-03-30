import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    const [totalsResult, recentEntriesResult] = await Promise.all([
      admin
        .from("hour_totals")
        .select("student_id, student_name, total_hours, verified_hours, last_updated")
        .eq("workspace_id", workspaceId)
        .order("student_name", { ascending: true }),
      admin
        .from("time_entries")
        .select("id, student_id, student_name, clock_in, clock_out, duration_minutes, verified")
        .eq("workspace_id", workspaceId)
        .order("clock_in", { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      totals: (totalsResult.data || []).map((t: Record<string, unknown>) => ({
        studentId: t.student_id,
        studentName: t.student_name || "Unknown",
        totalHours: Number(t.total_hours) || 0,
        verifiedHours: Number(t.verified_hours) || 0,
        lastUpdated: t.last_updated,
      })),
      recentEntries: (recentEntriesResult.data || []).map((e: Record<string, unknown>) => ({
        id: e.id,
        studentId: e.student_id,
        studentName: e.student_name || "Unknown",
        clockIn: e.clock_in,
        clockOut: e.clock_out,
        durationMinutes: e.duration_minutes,
        verified: e.verified,
      })),
    });
  } catch (err) {
    console.error("Hours route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
