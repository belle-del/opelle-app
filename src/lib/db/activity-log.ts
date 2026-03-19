import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "./workspaces";

export type ActivityAction =
  | "formula.created"
  | "client.created" | "client.updated" | "client.deleted"
  | "product.created" | "product.updated" | "product.deleted"
  | "appointment.created" | "appointment.updated" | "appointment.deleted"
  | "task.created" | "task.updated" | "task.deleted"
  | "mentis.chat"
  | "message.sent" | "message.received";

export type EntityType = "formula" | "client" | "product" | "appointment" | "task" | "mentis" | "message";

async function resolveWorkspaceId(): Promise<string | undefined> {
  const workspace = await getCurrentWorkspace();
  if (workspace) return workspace.id;
  const admin = createSupabaseAdminClient();
  const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
  return ws?.id;
}

export async function logActivity(
  action: ActivityAction,
  entityType: EntityType,
  entityId: string,
  entityLabel: string,
  diff?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
): Promise<void> {
  try {
    const wsId = await resolveWorkspaceId();
    if (!wsId) {
      console.warn("[activity-log] No workspace found, skipping log");
      return;
    }

    // Use admin client to bypass RLS — this is a trusted server-side operation
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("activity_log").insert({
      workspace_id: wsId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      diff: diff || null,
    });

    if (error) {
      console.error("[activity-log] Failed to log activity:", error.message);
    }
  } catch (err) {
    console.error("[activity-log] Unexpected error:", err);
  }
}

export type ActivityLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
};

export async function listActivityLog(entityType?: string): Promise<ActivityLogEntry[]> {
  try {
    const wsId = await resolveWorkspaceId();
    if (!wsId) return [];

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("activity_log")
      .select("*")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      action: row.action as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string | null,
      entityLabel: row.entity_label as string | null,
      diff: row.diff as Record<string, unknown> | null,
      createdAt: row.created_at as string,
    }));
  } catch {
    return [];
  }
}
