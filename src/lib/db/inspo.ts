import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "./workspaces";

export type InspoFlag = {
  id: string;
  clientId: string;
  stylistFlag: string | null;
  createdAt: string;
};

export async function getUnreviewedInspoFlags(): Promise<InspoFlag[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inspo_submissions")
    .select("id, client_id, stylist_flag, created_at")
    .eq("workspace_id", workspace.id)
    .eq("requires_consult", true)
    .eq("reviewed_by_stylist", false)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    stylistFlag: row.stylist_flag,
    createdAt: row.created_at,
  }));
}
