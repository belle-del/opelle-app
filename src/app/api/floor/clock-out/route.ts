import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { studentId } = await req.json();
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const now = new Date();
    const nowISO = now.toISOString();

    // 1. Find open time entry for this student
    const { data: openEntry } = await admin
      .from("time_entries")
      .select("id, clock_in")
      .eq("workspace_id", workspaceId)
      .eq("student_id", studentId)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .single();

    // 2. Update floor status
    const { error } = await admin
      .from("floor_status")
      .update({
        status: "clocked_out",
        clocked_in_at: null,
        status_changed_at: nowISO,
        current_client_id: null,
        current_service: null,
        updated_at: nowISO,
      })
      .eq("workspace_id", workspaceId)
      .eq("student_id", studentId);

    if (error) {
      console.error("Clock-out error:", error);
      return NextResponse.json({ error: "Failed to clock out" }, { status: 500 });
    }

    let durationMinutes = 0;

    // 3. Close time entry and calculate duration
    if (openEntry) {
      durationMinutes = Math.round(
        (now.getTime() - new Date(openEntry.clock_in).getTime()) / 60000
      );

      await admin
        .from("time_entries")
        .update({
          clock_out: nowISO,
          duration_minutes: durationMinutes,
        })
        .eq("id", openEntry.id);

      // 4. Upsert hour totals
      const hoursToAdd = durationMinutes / 60;

      const { data: existing } = await admin
        .from("hour_totals")
        .select("id, total_hours")
        .eq("workspace_id", workspaceId)
        .eq("student_id", studentId)
        .single();

      if (existing) {
        await admin
          .from("hour_totals")
          .update({
            total_hours: (Number(existing.total_hours) || 0) + hoursToAdd,
            last_updated: nowISO,
          })
          .eq("id", existing.id);
      } else {
        // Get student name from floor_status
        const { data: floorRow } = await admin
          .from("floor_status")
          .select("student_name")
          .eq("workspace_id", workspaceId)
          .eq("student_id", studentId)
          .single();

        await admin.from("hour_totals").insert({
          workspace_id: workspaceId,
          student_id: studentId,
          student_name: floorRow?.student_name || "",
          total_hours: hoursToAdd,
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: "clocked_out",
      durationMinutes,
    });
  } catch (err) {
    console.error("Clock-out route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
