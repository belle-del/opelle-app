import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getSession, completeSession } from "@/lib/db/service-sessions";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const session = await getSession(sessionId, workspaceId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    // Complete the session
    const completed = await completeSession(sessionId, workspaceId, body.afterPhotoUrl);
    if (!completed) {
      return NextResponse.json({ error: "Cannot complete from current status (must be in 'finishing')" }, { status: 400 });
    }

    // Reset floor status for this stylist
    const admin = createSupabaseAdminClient();
    await admin
      .from("floor_status")
      .update({
        status: "available",
        current_client_id: null,
        current_service: null,
        status_changed_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("student_id", session.stylistId);

    await logActivity("service.completed", "service_session", sessionId, `Completed: ${session.serviceName}`);

    return NextResponse.json({ session: completed });
  } catch (err) {
    console.error("Complete service error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
