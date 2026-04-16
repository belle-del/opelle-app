import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getActiveSession, getActiveSessionsForWorkspace } from "@/lib/db/service-sessions";
import { hasPermission } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TeamRole } from "@/lib/permissions";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    // Check user role for permission gating
    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Check workspace ownership as fallback
    const { data: workspace } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const role: TeamRole = workspace?.owner_id === user.id
      ? "owner"
      : (member?.role as TeamRole) || "stylist";
    const overrides = member?.permissions as Record<string, boolean> | undefined;

    // If user can view all services, return all active sessions
    if (hasPermission(role, "services.view_all", overrides)) {
      const sessions = await getActiveSessionsForWorkspace(workspaceId);
      return NextResponse.json({ sessions });
    }

    // Otherwise return only their own active session
    const session = await getActiveSession(user.id);
    return NextResponse.json({ sessions: session ? [session] : [] });
  } catch (err) {
    console.error("Active services error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
