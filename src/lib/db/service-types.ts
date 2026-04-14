import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServiceType, ServiceTypeRow } from "@/lib/types";
import { serviceTypeRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

export async function listServiceTypes(): Promise<ServiceType[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_types")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    if (error) console.error("[service-types] List failed:", error.message);
    return [];
  }
  return (data as ServiceTypeRow[]).map(serviceTypeRowToModel);
}

export async function getServiceType(id: string): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_types")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !data) return null;
  return serviceTypeRowToModel(data as ServiceTypeRow);
}

export async function createServiceType(input: {
  name: string;
  sortOrder?: number;
  durationMinutes?: number;
}): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const admin = createSupabaseAdminClient();

  // If no sort_order provided, put it at the end
  let sortOrder = input.sortOrder ?? 0;
  if (input.sortOrder === undefined) {
    const { data: maxRow } = await admin
      .from("service_types")
      .select("sort_order")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    sortOrder = (maxRow?.sort_order ?? -1) + 1;
  }

  const insertData: Record<string, unknown> = {
    workspace_id: workspace.id,
    name: input.name,
    sort_order: sortOrder,
  };
  if (input.durationMinutes !== undefined) {
    insertData.duration_minutes = input.durationMinutes;
  }

  let { data, error } = await admin
    .from("service_types")
    .insert(insertData)
    .select("*")
    .single();

  // If duration_minutes column doesn't exist, retry without it
  if (error && error.message?.includes("duration_minutes")) {
    console.warn("[service-types] duration_minutes column missing, retrying without it");
    delete insertData.duration_minutes;
    const retry = await admin
      .from("service_types")
      .insert(insertData)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[service-types] Create failed:", error.message);
    return null;
  }
  return serviceTypeRowToModel(data as ServiceTypeRow);
}

export async function updateServiceType(
  id: string,
  input: { name?: string; sortOrder?: number; durationMinutes?: number | null; bookingType?: string }
): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const admin = createSupabaseAdminClient();
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
  if (input.durationMinutes !== undefined) updateData.duration_minutes = input.durationMinutes;
  if (input.bookingType !== undefined) updateData.booking_type = input.bookingType;

  let { data, error } = await admin
    .from("service_types")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  // If duration_minutes column doesn't exist, retry without it
  if (error && error.message?.includes("duration_minutes")) {
    console.warn("[service-types] duration_minutes column missing, retrying without it");
    delete updateData.duration_minutes;
    if (Object.keys(updateData).length > 0) {
      const retry = await admin
        .from("service_types")
        .update(updateData)
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    console.error("[service-types] Update failed:", error.message);
    return null;
  }
  return serviceTypeRowToModel(data as ServiceTypeRow);
}

export async function deleteServiceType(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("service_types")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (error) console.error("[service-types] Delete failed:", error.message);
  return !error;
}

export async function seedDefaultServiceTypes(): Promise<void> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return;

  const admin = createSupabaseAdminClient();

  // Check if workspace already has service types
  const { data: existing } = await admin
    .from("service_types")
    .select("id")
    .eq("workspace_id", workspace.id)
    .limit(1);

  if (existing && existing.length > 0) return;

  const defaults = [
    "Base Color",
    "All Over Color",
    "Gloss",
    "Partial Highlight",
    "Full Highlight",
    "Partial Balayage",
    "Full Balayage",
    "Mini Highlight",
  ];

  await admin.from("service_types").insert(
    defaults.map((name, index) => ({
      workspace_id: workspace.id,
      name,
      sort_order: index,
    }))
  );
}
