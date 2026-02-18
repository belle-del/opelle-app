import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ServiceType, ServiceTypeRow } from "@/lib/types";
import { serviceTypeRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

export async function listServiceTypes(): Promise<ServiceType[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_types")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as ServiceTypeRow[]).map(serviceTypeRowToModel);
}

export async function getServiceType(id: string): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
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
}): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();

  // If no sort_order provided, put it at the end
  let sortOrder = input.sortOrder ?? 0;
  if (input.sortOrder === undefined) {
    const { data: maxRow } = await supabase
      .from("service_types")
      .select("sort_order")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    sortOrder = (maxRow?.sort_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("service_types")
    .insert({
      workspace_id: workspace.id,
      name: input.name,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return serviceTypeRowToModel(data as ServiceTypeRow);
}

export async function updateServiceType(
  id: string,
  input: { name?: string; sortOrder?: number }
): Promise<ServiceType | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("service_types")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return serviceTypeRowToModel(data as ServiceTypeRow);
}

export async function deleteServiceType(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("service_types")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}

export async function seedDefaultServiceTypes(): Promise<void> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return;

  const supabase = await createSupabaseServerClient();

  // Check if workspace already has service types
  const { data: existing } = await supabase
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

  await supabase.from("service_types").insert(
    defaults.map((name, index) => ({
      workspace_id: workspace.id,
      name,
      sort_order: index,
    }))
  );
}
