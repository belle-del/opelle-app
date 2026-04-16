import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getActiveSessionsForWorkspace } from "@/lib/db/service-sessions";

// GET /api/floor/sessions — all active service sessions for the workspace
// Used by FloorStatusWidget for real-time floor view
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const sessions = await getActiveSessionsForWorkspace(workspaceId);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("Floor sessions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
