import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Task, TaskRow, TaskStatus } from "@/lib/types";
import { taskRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";
import { publishEvent } from "@/lib/kernel";

async function resolveWorkspaceId(): Promise<string | undefined> {
  const workspace = await getCurrentWorkspace();
  if (workspace) return workspace.id;
  const admin = createSupabaseAdminClient();
  const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
  return ws?.id;
}

export async function listTasks(): Promise<Task[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("workspace_id", wsId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as TaskRow[]).map(taskRowToModel);
}

export async function getTask(id: string): Promise<Task | null> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", wsId)
    .single();

  if (error || !data) return null;
  return taskRowToModel(data as TaskRow);
}

export async function getPendingTasks(): Promise<Task[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("workspace_id", wsId)
    .neq("status", "completed")
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return (data as TaskRow[]).map(taskRowToModel);
}

export async function getUpcomingReminders(): Promise<Task[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];

  const admin = createSupabaseAdminClient();

  // Get current time and 24 hours from now
  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("workspace_id", wsId)
    .eq("reminder_enabled", true)
    .neq("status", "completed")
    .gte("reminder_at", now.toISOString())
    .lte("reminder_at", next24Hours.toISOString())
    .order("reminder_at", { ascending: true });

  if (error || !data) return [];
  return (data as TaskRow[]).map(taskRowToModel);
}

export async function createTask(input: {
  title: string;
  notes?: string;
  dueAt?: string;
  clientId?: string;
  reminderAt?: string;
  reminderEnabled?: boolean;
}): Promise<Task | null> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .insert({
      workspace_id: wsId,
      title: input.title,
      notes: input.notes || null,
      due_at: input.dueAt || null,
      client_id: input.clientId || null,
      reminder_at: input.reminderAt || null,
      reminder_enabled: input.reminderEnabled || false,
      attachments: [],
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return taskRowToModel(data as TaskRow);
}

export async function updateTask(
  id: string,
  input: {
    title?: string;
    notes?: string;
    dueAt?: string;
    status?: TaskStatus;
    clientId?: string;
    reminderAt?: string;
    reminderEnabled?: boolean;
    attachments?: unknown;
  }
): Promise<Task | null> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return null;

  const admin = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.notes !== undefined) updateData.notes = input.notes || null;
  if (input.dueAt !== undefined) updateData.due_at = input.dueAt || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.clientId !== undefined) updateData.client_id = input.clientId || null;
  if (input.reminderAt !== undefined) updateData.reminder_at = input.reminderAt || null;
  if (input.reminderEnabled !== undefined) updateData.reminder_enabled = input.reminderEnabled;
  if (input.attachments !== undefined) updateData.attachments = input.attachments;

  const { data, error } = await admin
    .from("tasks")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", wsId)
    .select("*")
    .single();

  if (error || !data) return null;

  const task = taskRowToModel(data as TaskRow);

  // Fire kernel event when task is completed
  if (input.status === "completed") {
    publishEvent({
      event_type: "task_completed",
      workspace_id: wsId,
      timestamp: new Date().toISOString(),
      payload: {
        task_id: task.id,
        title: task.title,
        client_id: task.clientId ?? null,
      },
    });
  }

  return task;
}

export async function deleteTask(id: string): Promise<boolean> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return false;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("workspace_id", wsId);

  return !error;
}
