import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Client, ClientRow } from "@/lib/types";
import { clientRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";
import { publishEvent } from "@/lib/kernel";

export async function listClients(): Promise<Client[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    // Fallback: get workspace directly
    const admin = createSupabaseAdminClient();
    const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
    if (!ws) return [];
    const { data, error } = await admin
      .from("clients")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as ClientRow[]).map(clientRowToModel);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ClientRow[]).map(clientRowToModel);
}

export async function getClient(id: string): Promise<Client | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("*")
    .eq("id", id)
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

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
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

  if (error || !data) {
    console.error("[createClient] Insert failed:", error?.message);
    return null;
  }

  const client = clientRowToModel(data as ClientRow);

  // ── Canonical dedup: link to existing client if match found ──
  try {
    const { data: canonicalId } = await admin.rpc("find_canonical_client", {
      p_first_name: input.firstName,
      p_last_name: input.lastName || null,
      p_email: input.email || null,
      p_phone: input.phone || null,
    });

    if (canonicalId && canonicalId !== client.id) {
      await admin
        .from("clients")
        .update({ canonical_client_id: canonicalId })
        .eq("id", client.id);
      client.canonicalClientId = canonicalId;
    }
  } catch (e) {
    console.error("[createClient] canonical dedup failed (non-critical):", e);
  }

  // ── Create client-stylist assignment (owner as primary) ──
  try {
    await admin.from("client_stylist_assignments").insert({
      workspace_id: workspace.id,
      client_id: client.id,
      stylist_id: workspace.ownerId,
      is_primary: true,
    });
  } catch (e) {
    console.error("[createClient] stylist assignment failed (non-critical):", e);
  }

  // Fire kernel event (non-blocking)
  publishEvent({
    event_type: "client_updated",
    workspace_id: workspace.id,
    timestamp: new Date().toISOString(),
    payload: {
      client_id: client.id,
      first_name: client.firstName,
      last_name: client.lastName ?? null,
      tags: client.tags,
      notes: client.notes ?? null,
    },
  });

  return client;
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
  const admin = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (input.firstName !== undefined) updateData.first_name = input.firstName;
  if (input.lastName !== undefined) updateData.last_name = input.lastName || null;
  if (input.pronouns !== undefined) updateData.pronouns = input.pronouns || null;
  if (input.phone !== undefined) updateData.phone = input.phone || null;
  if (input.email !== undefined) updateData.email = input.email || null;
  if (input.notes !== undefined) updateData.notes = input.notes || null;
  if (input.tags !== undefined) updateData.tags = input.tags;

  const { data, error } = await admin
    .from("clients")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[updateClient] Failed:", error?.message);
    return null;
  }

  const workspace = await getCurrentWorkspace();

  const client = clientRowToModel(data as ClientRow);

  // Fire kernel event (non-blocking)
  publishEvent({
    event_type: "client_updated",
    workspace_id: workspace?.id || "",
    timestamp: new Date().toISOString(),
    payload: {
      client_id: client.id,
      first_name: client.firstName,
      last_name: client.lastName ?? null,
      tags: client.tags,
      notes: client.notes ?? null,
    },
  });

  return client;
}

export async function deleteClient(id: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("clients")
    .delete()
    .eq("id", id);

  if (error) console.error("[deleteClient] Failed:", error.message);
  return !error;
}

export async function searchClients(query: string): Promise<Client[]> {
  const workspace = await getCurrentWorkspace();
  const admin = createSupabaseAdminClient();

  let workspaceId = workspace?.id;
  if (!workspaceId) {
    const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
    workspaceId = ws?.id;
  }
  if (!workspaceId) return [];

  const { data, error } = await admin
    .from("clients")
    .select("*")
    .eq("workspace_id", workspaceId)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ClientRow[]).map(clientRowToModel);
}

export async function listClientsForStylist(
  workspaceId: string,
  stylistId: string
): Promise<Client[]> {
  const admin = createSupabaseAdminClient();

  // Get client IDs assigned to this stylist
  const { data: assignments, error: aErr } = await admin
    .from("client_stylist_assignments")
    .select("client_id")
    .eq("workspace_id", workspaceId)
    .eq("stylist_id", stylistId);

  if (aErr || !assignments || assignments.length === 0) return [];

  const clientIds = assignments.map((a: { client_id: string }) => a.client_id);

  const { data, error } = await admin
    .from("clients")
    .select("*")
    .in("id", clientIds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ClientRow[]).map(clientRowToModel);
}

export async function getCanonicalMatches(
  canonicalClientId: string
): Promise<Client[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("clients")
    .select("*")
    .or(`canonical_client_id.eq.${canonicalClientId},id.eq.${canonicalClientId}`)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as ClientRow[]).map(clientRowToModel);
}
