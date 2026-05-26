import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Get workspace ID for a user — checks ownership first, then membership.
 * Returns null if the user has no claim on any workspace.
 *
 * IMPORTANT: this function does NOT fall back to "first workspace in DB".
 * That was a multi-tenant security hole — it silently granted users access
 * to other people's workspaces.
 *
 * For users who own multiple workspaces, the deterministic choice is the
 * earliest-created one (consistent across requests, no .single() throwing
 * on multi-row results).
 */
export async function getWorkspaceId(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  // 1. Owned workspace (deterministic — oldest first)
  const { data: owned } = await admin
    .from("workspaces")
    .select("id, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned) return owned.id;

  // 2. Member of a workspace (oldest, non-inactive)
  const { data: membership } = await admin
    .from("workspace_members")
    .select("workspace_id, created_at")
    .eq("user_id", userId)
    .or("status.neq.inactive,status.is.null")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership) return membership.workspace_id;

  // 3. No claim on any workspace — return null. Callers must handle this.
  console.warn("[getWorkspaceId] user has no owned/membership workspace:", userId);
  return null;
}
