import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getSession, updateSessionStatus } from "@/lib/db/service-sessions";
import { createServiceTask } from "@/lib/db/service-tasks";
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
    const note = body.note || "Help requested";

    // Update session status to needs_help
    const updated = await updateSessionStatus(sessionId, workspaceId, "needs_help", {
      help_request_note: note,
    });

    if (!updated) {
      return NextResponse.json({ error: "Cannot request help from current status" }, { status: 400 });
    }

    // Create an urgent task (assigned to the requesting stylist — admin/instructor will see it)
    await createServiceTask({
      workspaceId,
      sessionId,
      assignedTo: session.stylistId,
      assignedBy: user.id,
      taskType: "custom",
      description: `HELP: ${note}`,
      priority: "urgent",
    });

    await logActivity("service.help_requested", "service_session", sessionId, `Help: ${note}`);

    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error("Help request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
