import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDbConfigured } from "@/lib/db/health";
import type { Client } from "@/lib/models";
import { clientModelToRow, clientRowToModel, ClientRow } from "@/lib/db/types";

export const listClients = async (): Promise<Client[]> => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();

  // Get the authenticated user to filter clients by stylist_id
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("User must be authenticated to list clients");
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("stylist_id", user.id)
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

  // Get the authenticated user to use as stylist_id
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("User must be authenticated to create a client");
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(clientModelToRow(input, user.id))
    .select("*")
    .single();
  if (error) throw error;
  return clientRowToModel(data as ClientRow);
};

export const updateClient = async (id: string, input: Partial<Client>) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("User must be authenticated to update a client");
  }

  // Don't pass stylist_id on updates - it shouldn't change
  const updateData = clientModelToRow(input);
  delete updateData.stylist_id;

  const { data, error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", id)
    .eq("stylist_id", user.id) // Ensure user can only update their own clients
    .select("*")
    .single();
  if (error) throw error;
  return clientRowToModel(data as ClientRow);
};

export const deleteClient = async (id: string) => {
  if (!isDbConfigured()) throw new Error("DB not configured.");
  const supabase = createSupabaseServerClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("User must be authenticated to delete a client");
  }

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("stylist_id", user.id); // Ensure user can only delete their own clients
  if (error) throw error;
};
