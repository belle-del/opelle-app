import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { updateServiceTaskStatus } from "@/lib/db/service-tasks";
import { logActivity } from "@/lib/db/activity-log";
import type { ServiceTaskStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const body = await req.json();
    const newStatus = body.status as ServiceTaskStatus;
    if (!newStatus) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }

    const task = await updateServiceTaskStatus(taskId, workspaceId, newStatus);
    if (!task) {
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    if (newStatus === "done") {
      await logActivity("service_task.completed", "service_task", taskId, task.description || task.taskType);
    }

    return NextResponse.json({ task });
  } catch (err) {
    console.error("Update service task error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
