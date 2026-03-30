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
    const now = new Date().toISOString();

    const { error } = await admin
      .from("floor_status")
      .update({
        status: "available",
        clocked_in_at: now,
        status_changed_at: now,
        current_client_id: null,
        current_service: null,
        updated_at: now,
      })
      .eq("workspace_id", workspaceId)
      .eq("student_id", studentId);

    if (error) {
      console.error("Clock-in error:", error);
      return NextResponse.json({ error: "Failed to clock in" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: "available" });
  } catch (err) {
    console.error("Clock-in route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
