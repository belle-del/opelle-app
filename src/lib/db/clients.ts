import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDbConfigured } from "@/lib/db/health";
import type { Client } from "@/lib/models";
import { clientModelToRow, clientRowToModel, ClientRow } from "@/lib/db/types";

export const listClients = async (): Promise<Client[]> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ClientRow[]).map(clientRowToModel);
};

export const getClient = async (id: string): Promise<Client | null> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(clientModelToRow(input))
    .select("*")
    .single();
  if (error) throw error;
  return clientRowToModel(data as ClientRow);
};

export const updateClient = async (id: string, input: Partial<Client>) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
};
