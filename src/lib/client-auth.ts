import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client, ClientRow, ClientUserRow } from "@/lib/types";
import { clientRowToModel } from "@/lib/types";

export type ClientContext = {
  clientUser: {
    id: string;
    authUserId: string;
    clientId: string;
    workspaceId: string;
  };
  client: Client;
  workspaceName: string;
  stylistName: string;
};

export async function getClientContext(): Promise<ClientContext | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get client_users record
  const { data: clientUserRow } = await supabase
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!clientUserRow) return null;
  const cu = clientUserRow as ClientUserRow;

  // Get client record
  const { data: clientRow } = await supabase
    .from("clients")
    .select("*")
    .eq("id", cu.client_id)
    .single();

  if (!clientRow) return null;

  // Get workspace name and stylist display name
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, owner_id")
    .eq("id", cu.workspace_id)
    .single();

  let stylistName = "your stylist";
  if (workspace) {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("display_name")
      .eq("workspace_id", cu.workspace_id)
      .eq("user_id", workspace.owner_id)
      .single();
    if (member?.display_name) {
      stylistName = member.display_name;
    } else {
      stylistName = workspace.name;
    }
  }

  return {
    clientUser: {
      id: cu.id,
      authUserId: cu.auth_user_id,
      clientId: cu.client_id,
      workspaceId: cu.workspace_id,
    },
    client: clientRowToModel(clientRow as ClientRow),
    workspaceName: workspace?.name ?? "",
    stylistName,
  };
}
