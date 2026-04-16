import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServiceTask, ServiceTaskRow, ServiceTaskType, ServiceTaskPriority, ServiceTaskStatus } from "@/lib/types";
import { serviceTaskRowToModel } from "@/lib/types";
import { publishEvent } from "@/lib/kernel";

export async function createServiceTask(input: {
  workspaceId: string;
  sessionId?: string;
  assignedTo: string;
  assignedBy: string;
  taskType: ServiceTaskType;
  description?: string;
  dueInMinutes?: number;
  priority?: ServiceTaskPriority;
}): Promise<ServiceTask | null> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const dueAt = input.dueInMinutes
    ? new Date(Date.now() + input.dueInMinutes * 60 * 1000).toISOString()
    : null;

  const { data, error } = await admin
    .from("service_tasks")
    .insert({
      workspace_id: input.workspaceId,
      session_id: input.sessionId || null,
      assigned_to: input.assignedTo,
      assigned_by: input.assignedBy,
      task_type: input.taskType,
      description: input.description || null,
      due_in_minutes: input.dueInMinutes || null,
      due_at: dueAt,
      priority: input.priority || "normal",
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to create service task:", error);
    return null;
  }

  const task = serviceTaskRowToModel(data as ServiceTaskRow);

  publishEvent({
    event_type: "service_task.assigned",
    workspace_id: input.workspaceId,
    timestamp: now,
    payload: {
      task_id: task.id,
      session_id: input.sessionId ?? null,
      assigned_to: input.assignedTo,
      assigned_by: input.assignedBy,
      task_type: input.taskType,
      priority: task.priority,
    },
  }).catch(() => {});

  return task;
}

export async function getMyTasks(userId: string, workspaceId: string): Promise<ServiceTask[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("assigned_to", userId)
    .in("status", ["pending", "in_progress"])
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ServiceTaskRow[]).map(serviceTaskRowToModel);
}

export async function getActiveTasks(workspaceId: string): Promise<ServiceTask[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "in_progress"])
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ServiceTaskRow[]).map(serviceTaskRowToModel);
}

export async function updateServiceTaskStatus(
  taskId: string,
  workspaceId: string,
  newStatus: ServiceTaskStatus
): Promise<ServiceTask | null> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };

  if (newStatus === "in_progress") updateData.started_at = now;
  if (newStatus === "done") updateData.completed_at = now;

  const { data, error } = await admin
    .from("service_tasks")
    .update(updateData)
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error || !data) return null;

  const task = serviceTaskRowToModel(data as ServiceTaskRow);

  if (newStatus === "done") {
    publishEvent({
      event_type: "service_task.completed",
      workspace_id: workspaceId,
      timestamp: now,
      payload: {
        task_id: task.id,
        session_id: task.sessionId ?? null,
        assigned_to: task.assignedTo,
        task_type: task.taskType,
      },
    }).catch(() => {});
  }

  return task;
}
