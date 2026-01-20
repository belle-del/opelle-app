import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client, ClientRow } from "@/lib/types";
import { clientRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

export async function listClients(): Promise<Client[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ClientRow[]).map(clientRowToModel);
}

export async function getClient(id: string): Promise<Client | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !data) return null;
  return clientRowToModel(data as ClientRow);
}

export async function createClient(input: {
  firstName: string;
  lastName?: string;
  pronouns?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
}): Promise<Client | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      workspace_id: workspace.id,
      first_name: input.firstName,
      last_name: input.lastName || null,
      pronouns: input.pronouns || null,
      phone: input.phone || null,
      email: input.email || null,
      notes: input.notes || null,
      tags: input.tags || [],
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return clientRowToModel(data as ClientRow);
}

export async function updateClient(
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    pronouns?: string;
    phone?: string;
    email?: string;
    notes?: string;
    tags?: string[];
  }
): Promise<Client | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();

  const updateData: Record<string, unknown> = {};
  if (input.firstName !== undefined) updateData.first_name = input.firstName;
  if (input.lastName !== undefined) updateData.last_name = input.lastName || null;
  if (input.pronouns !== undefined) updateData.pronouns = input.pronouns || null;
  if (input.phone !== undefined) updateData.phone = input.phone || null;
  if (input.email !== undefined) updateData.email = input.email || null;
  if (input.notes !== undefined) updateData.notes = input.notes || null;
  if (input.tags !== undefined) updateData.tags = input.tags;

  const { data, error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return clientRowToModel(data as ClientRow);
}

export async function deleteClient(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}

export async function searchClients(query: string): Promise<Client[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("workspace_id", workspace.id)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ClientRow[]).map(clientRowToModel);
}
