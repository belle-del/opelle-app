import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Workspace, WorkspaceRow } from "@/lib/types";
import { workspaceRowToModel } from "@/lib/types";

export async function getCurrentWorkspace(): Promise<Workspace | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (error || !data) return null;
  return workspaceRowToModel(data as WorkspaceRow);
}

export async function createWorkspace(name: string): Promise<Workspace | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name })
    .select("*")
    .single();

  if (error || !data) return null;
  return workspaceRowToModel(data as WorkspaceRow);
}

export async function updateWorkspace(id: string, name: string): Promise<Workspace | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  return workspaceRowToModel(data as WorkspaceRow);
}
