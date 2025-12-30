import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDbConfigured } from "@/lib/db/health";
import type { Client } from "@/lib/models";
import {
  clientModelToRow,
  clientRowToModel,
  ClientRow,
} from "@/lib/db/types";

const requireUserId = async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not authenticated.");
  }
  return { supabase, userId: data.user.id };
};

export const listClients = async (): Promise<Client[]> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const { supabase } = await requireUserId();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ClientRow[]).map(clientRowToModel);
};

export const getClient = async (id: string): Promise<Client | null> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const { supabase } = await requireUserId();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? clientRowToModel(data as ClientRow) : null;
};

export const createClient = async (input: Partial<Client>) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...clientModelToRow({ ...input, stylist_id: userId }),
      stylist_id: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return clientRowToModel(data as ClientRow);
};

export const updateClient = async (id: string, input: Partial<Client>) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const { supabase } = await requireUserId();
  const { data, error } = await supabase
    .from("clients")
    .update(clientModelToRow(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return clientRowToModel(data as ClientRow);
};

export const deleteClient = async (id: string) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
};

export const ensureInviteToken = async (clientId: string) => {
  const client = await getClient(clientId);
  if (!client) throw new Error("Client not found.");
  if (client.inviteToken && client.inviteUpdatedAt) {
    return { token: client.inviteToken, updatedAt: client.inviteUpdatedAt };
  }
  const token = client.inviteToken ?? "";
  const updated = await updateClient(clientId, {
    inviteToken: token,
    inviteUpdatedAt: new Date().toISOString(),
  });
  return {
    token: updated.inviteToken ?? "",
    updatedAt: updated.inviteUpdatedAt ?? new Date().toISOString(),
  };
};

export const regenerateInviteToken = async (
  clientId: string,
  token: string
) => {
  const updated = await updateClient(clientId, {
    inviteToken: token,
    inviteUpdatedAt: new Date().toISOString(),
  });
  return {
    token: updated.inviteToken ?? token,
    updatedAt: updated.inviteUpdatedAt ?? new Date().toISOString(),
  };
};
