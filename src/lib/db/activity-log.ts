import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "./workspaces";

export type ActivityAction =
  | "formula.created"
  | "client.created" | "client.updated" | "client.deleted"
  | "product.created" | "product.updated" | "product.deleted"
  | "appointment.created" | "appointment.updated" | "appointment.deleted"
  | "task.created" | "task.updated" | "task.deleted";

export type EntityType = "formula" | "client" | "product" | "appointment" | "task";

export async function logActivity(
  action: ActivityAction,
  entityType: EntityType,
  entityId: string,
  entityLabel: string,
  diff?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
): Promise<void> {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return;

    const supabase = await createSupabaseServerClient();
    await supabase.from("activity_log").insert({
      workspace_id: workspace.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      diff: diff || null,
    });
  } catch {
    // Never throw from logging — non-critical
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
    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("activity_log")
      .select("*")
      .eq("workspace_id", workspace.id)
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
