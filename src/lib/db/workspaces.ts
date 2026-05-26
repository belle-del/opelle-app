import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Workspace, WorkspaceRow } from "@/lib/types";
import { workspaceRowToModel } from "@/lib/types";

function generateStylistCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueStylistCode(): Promise<string> {
  const admin = createSupabaseAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateStylistCode();
    const { data } = await admin
      .from("workspaces")
      .select("id")
      .eq("stylist_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Failed to generate unique stylist code after 5 attempts");
}

export async function getCurrentWorkspace(): Promise<Workspace | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error("[getCurrentWorkspace] No user. Auth error:", authError?.message || "none — cookies may be missing");
    return null;
  }
  console.log("[getCurrentWorkspace] User:", user.id, user.email);

  // Use admin client to bypass RLS — we already verified the user is authenticated.
  // Deterministic resolution: oldest owned workspace, else oldest membership.
  // NEVER fall back to "first workspace in DB" — that silently grants access
  // to other people's workspaces.
  const admin = createSupabaseAdminClient();
  const { data: owned } = await admin
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned) return workspaceRowToModel(owned as WorkspaceRow);

  // Fallback: oldest membership (non-inactive)
  const { data: membership } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .or("status.neq.inactive,status.is.null")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership) {
    const { data: ws } = await admin
      .from("workspaces")
      .select("*")
      .eq("id", membership.workspace_id)
      .maybeSingle();
    if (ws) return workspaceRowToModel(ws as WorkspaceRow);
  }

  console.warn("[getCurrentWorkspace] no workspace claim for user:", user.id);
  return null;
}

export async function createWorkspace(name: string): Promise<Workspace | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const stylistCode = await generateUniqueStylistCode();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .insert({ owner_id: user.id, name, stylist_code: stylistCode })
    .select("*")
    .single();

  if (error || !data) return null;

  // Also create workspace_members entry for owner
  await admin
    .from("workspace_members")
    .insert({ workspace_id: data.id, user_id: user.id, role: 'owner' });

  return workspaceRowToModel(data as WorkspaceRow);
}

export async function updateWorkspace(id: string, name: string): Promise<Workspace | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("workspaces")
    .update({ name })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  return workspaceRowToModel(data as WorkspaceRow);
}

/**
 * Returns the workspace's school_mode flag (default false).
 *
 * Fail-closed: returns false on any error / missing row / missing column.
 * That's the safer default — supervision is OPT-IN, not opt-out. If the
 * column doesn't exist yet (pre-migration), the supervision gates are
 * inactive, which matches the pre-school_mode behavior.
 */
export async function isSchoolMode(workspaceId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("workspaces")
    .select("school_mode")
    .eq("id", workspaceId)
    .maybeSingle();
  return Boolean((data as { school_mode?: boolean } | null)?.school_mode);
}

export async function regenerateStylistCode(workspaceId: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const newCode = await generateUniqueStylistCode();

  const { error } = await admin
    .from("workspaces")
    .update({ stylist_code: newCode })
    .eq("id", workspaceId);

  if (error) {
    console.error("[regenerateStylistCode] Error:", error.message);
    throw new Error("Failed to regenerate stylist code");
  }
  return newCode;
}
