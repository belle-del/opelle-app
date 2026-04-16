import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getSession, updateSessionStatus } from "@/lib/db/service-sessions";
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
    const extras: Record<string, unknown> = {};
    if (body.beforePhotoUrl) extras.before_photo_url = body.beforePhotoUrl;

    const updated = await updateSessionStatus(sessionId, workspaceId, "in_progress", extras);
    if (!updated) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    await logActivity("service.started", "service_session", sessionId, `Started: ${session.serviceName}`);

    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error("Start service error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
