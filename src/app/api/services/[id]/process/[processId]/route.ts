import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { updateProcess, removeProcess } from "@/lib/db/service-sessions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; processId: string }> }
) {
  try {
    const { id: sessionId, processId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const body = await req.json();
    const action = body.action as "start" | "pause" | "complete";
    if (!["start", "pause", "complete"].includes(action)) {
      return NextResponse.json({ error: "action must be start, pause, or complete" }, { status: 400 });
    }

    const session = await updateProcess(sessionId, workspaceId, processId, action, body.notes);
    if (!session) {
      return NextResponse.json({ error: "Failed to update process (check dependencies)" }, { status: 400 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Update process error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; processId: string }> }
) {
  try {
    const { id: sessionId, processId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const session = await removeProcess(sessionId, workspaceId, processId);
    if (!session) {
      return NextResponse.json({ error: "Failed to remove process" }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Remove process error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
