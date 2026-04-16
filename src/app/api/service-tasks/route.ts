import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { createServiceTask, getActiveTasks } from "@/lib/db/service-tasks";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/db/activity-log";
import type { TeamRole } from "@/lib/permissions";
import type { ServiceTaskType, ServiceTaskPriority } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const tasks = await getActiveTasks(workspaceId);
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("List service tasks error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    // Check tasks.assign permission
    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: workspace } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const role: TeamRole = workspace?.owner_id === user.id
      ? "owner"
      : (member?.role as TeamRole) || "stylist";
    const overrides = member?.permissions as Record<string, boolean> | undefined;

    if (!hasPermission(role, "tasks.assign", overrides)) {
      return NextResponse.json({ error: "Permission denied: tasks.assign required" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.assignedTo || !body.taskType) {
      return NextResponse.json({ error: "assignedTo and taskType required" }, { status: 400 });
    }

    const task = await createServiceTask({
      workspaceId,
      sessionId: body.sessionId,
      assignedTo: body.assignedTo,
      assignedBy: user.id,
      taskType: body.taskType as ServiceTaskType,
      description: body.description,
      dueInMinutes: body.dueInMinutes,
      priority: (body.priority as ServiceTaskPriority) || "normal",
    });

    if (!task) {
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    await logActivity("service_task.assigned", "service_task", task.id, task.description || task.taskType);

    return NextResponse.json({ task });
  } catch (err) {
    console.error("Create service task error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
