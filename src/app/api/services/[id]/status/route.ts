import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getSession, updateSessionStatus } from "@/lib/db/service-sessions";
import type { ServiceSessionStatus } from "@/lib/types";

export async function PATCH(
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

    const body = await req.json();
    const newStatus = body.status as ServiceSessionStatus;
    if (!newStatus) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }

    const extras: Record<string, unknown> = {};
    if (body.processingTimerMinutes) extras.processing_timer_minutes = body.processingTimerMinutes;
    if (body.helpRequestNote) extras.help_request_note = body.helpRequestNote;
    if (body.beforePhotoUrl) extras.before_photo_url = body.beforePhotoUrl;
    if (body.afterPhotoUrl) extras.after_photo_url = body.afterPhotoUrl;

    const updated = await updateSessionStatus(sessionId, workspaceId, newStatus, extras);
    if (!updated) {
      return NextResponse.json(
        { error: `Invalid transition from '${session.status}' to '${newStatus}'` },
        { status: 400 }
      );
    }

    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error("Update status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
