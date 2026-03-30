import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

// Resets all students to clocked_out — useful before a demo
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from("floor_status")
      .update({
        status: "clocked_out",
        clocked_in_at: null,
        current_client_id: null,
        current_service: null,
        status_changed_at: now,
        updated_at: now,
      })
      .eq("workspace_id", workspaceId)
      .select("id");

    if (error) {
      console.error("Reset error:", error);
      return NextResponse.json({ error: "Failed to reset" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (err) {
    console.error("Reset route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
