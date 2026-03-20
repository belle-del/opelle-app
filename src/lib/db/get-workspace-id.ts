import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Get workspace ID for a user — checks ownership first, then membership.
 * Uses admin client to bypass RLS.
 */
export async function getWorkspaceId(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  // First: check if user owns a workspace
  const { data: owned } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (owned) return owned.id;

  // Fallback: check if user is a workspace member (non-owner stylist)
  const { data: membership } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (membership) return membership.workspace_id;

  return null;
}
