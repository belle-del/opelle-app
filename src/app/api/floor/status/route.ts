import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { studentId, status, clientId, service } = await req.json();
    if (!studentId || !status) {
      return NextResponse.json({ error: "studentId and status required" }, { status: 400 });
    }

    const validStatuses = ["clocked_out", "available", "with_client", "on_break"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      status,
      status_changed_at: now,
      updated_at: now,
    };

    if (status === "with_client") {
      updateData.current_client_id = clientId || null;
      updateData.current_service = service || null;
    } else {
      updateData.current_client_id = null;
      updateData.current_service = null;
    }

    if (status === "clocked_out") {
      updateData.clocked_in_at = null;
    }

    const { error } = await admin
      .from("floor_status")
      .update(updateData)
      .eq("workspace_id", workspaceId)
      .eq("student_id", studentId);

    if (error) {
      console.error("Status update error:", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("Status route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
