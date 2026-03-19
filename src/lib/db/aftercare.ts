import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AftercarePlan } from "@/lib/types";

type AftercarePlanRow = {
  id: string;
  workspace_id: string;
  appointment_id: string;
  client_id: string;
  client_visible_notes: string | null;
  recommended_products: string[] | null;
  published_at: string | null;
};

function rowToModel(row: AftercarePlanRow): AftercarePlan {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    appointmentId: row.appointment_id,
    clientId: row.client_id,
    clientVisibleNotes: row.client_visible_notes ?? undefined,
    recommendedProducts: row.recommended_products ?? [],
    publishedAt: row.published_at ?? "",
  };
}

export async function getAftercarePlanByAppointment(
  appointmentId: string
): Promise<AftercarePlan | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("aftercare_plans")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToModel(data as AftercarePlanRow);
}

export async function getAftercarePlansForClient(
  clientId: string
): Promise<AftercarePlan[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("aftercare_plans")
    .select("*")
    .eq("client_id", clientId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return (data as AftercarePlanRow[]).map(rowToModel);
}

export async function createAftercarePlan(params: {
  workspaceId: string;
  appointmentId: string;
  clientId: string;
  clientVisibleNotes: string;
  publish: boolean;
}): Promise<AftercarePlan | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("aftercare_plans")
    .insert({
      workspace_id: params.workspaceId,
      appointment_id: params.appointmentId,
      client_id: params.clientId,
      client_visible_notes: params.clientVisibleNotes,
      recommended_products: [],
      published_at: params.publish ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return rowToModel(data as AftercarePlanRow);
}

export async function updateAftercarePlan(
  id: string,
  updates: {
    clientVisibleNotes?: string;
    publish?: boolean;
  }
): Promise<AftercarePlan | null> {
  const admin = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (updates.clientVisibleNotes !== undefined) {
    updateData.client_visible_notes = updates.clientVisibleNotes;
  }
  if (updates.publish === true) {
    updateData.published_at = new Date().toISOString();
  } else if (updates.publish === false) {
    updateData.published_at = null;
  }

  const { data, error } = await admin
    .from("aftercare_plans")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  return rowToModel(data as AftercarePlanRow);
}
