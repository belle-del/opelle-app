import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { hasPermission } from "@/lib/permissions";
import type { Permission, TeamRole } from "@/lib/permissions";
import type { WorkspaceMember, TeamInvite, WorkspaceMemberRow, TeamInviteRow } from "@/lib/types";
import { workspaceMemberRowToModel, teamInviteRowToModel } from "@/lib/types";

// ── Query helpers ────────────────────────────────────────────

export async function listTeamMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("role", { ascending: true })
    .order("display_name", { ascending: true });

  if (error) {
    console.error("[team] listTeamMembers error:", error.message);
    return [];
  }
  return (data as WorkspaceMemberRow[]).map(workspaceMemberRowToModel);
}

export async function getTeamMember(id: string, workspaceId: string): Promise<WorkspaceMember | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspace_members")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) return null;
  return workspaceMemberRowToModel(data as WorkspaceMemberRow);
}

export async function updateTeamMember(
  id: string,
  workspaceId: string,
  updates: Partial<{
    role: string;
    display_name: string;
    permissions: Record<string, boolean>;
    status: string;
    pay_type: string;
    hire_date: string | null;
    email: string | null;
    phone: string | null;
  }>,
): Promise<WorkspaceMember | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspace_members")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[team] updateTeamMember error:", error?.message);
    return null;
  }
  return workspaceMemberRowToModel(data as WorkspaceMemberRow);
}

export async function deactivateTeamMember(id: string, workspaceId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("workspace_members")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[team] deactivateTeamMember error:", error.message);
    return false;
  }
  return true;
}

export async function countActiveOwners(workspaceId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .eq("status", "active");

  if (error) return 0;
  return count ?? 0;
}

// ── Invite helpers ───────────────────────────────────────────

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function createTeamInvite(
  workspaceId: string,
  role: string,
  invitedBy: string,
  email?: string,
): Promise<TeamInvite | null> {
  const admin = createSupabaseAdminClient();

  // Generate unique token (retry up to 5 times)
  let token = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateToken();
    const { data } = await admin
      .from("team_invites")
      .select("id")
      .eq("token", candidate)
      .maybeSingle();
    if (!data) {
      token = candidate;
      break;
    }
  }
  if (!token) return null;

  const { data, error } = await admin
    .from("team_invites")
    .insert({
      workspace_id: workspaceId,
      role,
      token,
      invited_by: invitedBy,
      email: email || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[team] createTeamInvite error:", error?.message);
    return null;
  }
  return teamInviteRowToModel(data as TeamInviteRow);
}

export async function getTeamInviteByToken(token: string): Promise<TeamInvite | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) return null;
  return teamInviteRowToModel(data as TeamInviteRow);
}

export async function acceptTeamInvite(
  token: string,
  userId: string,
  displayName?: string,
): Promise<{ member: WorkspaceMember | null; error?: string }> {
  const admin = createSupabaseAdminClient();

  // Get invite
  const invite = await getTeamInviteByToken(token);
  if (!invite) return { member: null, error: "Invalid invite token" };
  if (invite.acceptedAt) return { member: null, error: "Invite already used" };
  if (new Date(invite.expiresAt) < new Date()) return { member: null, error: "Invite expired" };

  // Check if user is already a member of this workspace
  const { data: existing } = await admin
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", invite.workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Already a member — NEVER downgrade an owner
    if (existing.role === "owner") {
      await admin
        .from("team_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
      return { member: null, error: "This user is already the workspace owner" };
    }

    // For non-owners: update their role to the invited role (upgrade path)
    // e.g., a client who is also a student, or a stylist getting promoted to instructor
    const { data: updated, error: updateError } = await admin
      .from("workspace_members")
      .update({
        role: invite.role,
        display_name: displayName || undefined,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    await admin
      .from("team_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (updateError || !updated) {
      return { member: null, error: `Failed to update role: ${updateError?.message}` };
    }
    return { member: workspaceMemberRowToModel(updated as WorkspaceMemberRow) };
  }

  // New member — create workspace_members entry
  const { data: member, error: memberError } = await admin
    .from("workspace_members")
    .insert({
      workspace_id: invite.workspaceId,
      user_id: userId,
      role: invite.role,
      display_name: displayName || null,
      status: "active",
    })
    .select("*")
    .single();

  if (memberError) {
    console.error("[team] acceptTeamInvite member error:", memberError.message, memberError.code, memberError.details);
    return { member: null, error: `Failed to join: ${memberError.message}` };
  }

  // Mark invite as accepted
  await admin
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { member: workspaceMemberRowToModel(member as WorkspaceMemberRow) };
}

export async function listPendingInvites(workspaceId: string): Promise<TeamInvite[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("team_invites")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as TeamInviteRow[]).map(teamInviteRowToModel);
}

// ── Permission checks ────────────────────────────────────────

/**
 * Get the current user's role and permission overrides for their workspace.
 * Returns null if user is not authenticated or not a workspace member.
 */
export async function getMemberRole(
  userId: string,
  workspaceId: string,
): Promise<{ role: TeamRole; permissions: Record<string, boolean> } | null> {
  const admin = createSupabaseAdminClient();

  // FIRST: check if user is the workspace owner — this always takes priority
  const { data: ws } = await admin
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (ws) {
    // Owner — read their permission overrides from workspace_members if they have an entry
    const { data: ownerMember } = await admin
      .from("workspace_members")
      .select("permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    return {
      role: "owner" as TeamRole,
      permissions: (ownerMember?.permissions as Record<string, boolean>) ?? {},
    };
  }

  // SECOND: check workspace_members for non-owners
  const { data } = await admin
    .from("workspace_members")
    .select("role, permissions, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .or("status.neq.inactive,status.is.null")
    .single();

  if (data) {
    return {
      role: data.role as TeamRole,
      permissions: (data.permissions as Record<string, boolean>) ?? {},
    };
  }

  return null;
}

/**
 * Server-side permission guard. Call at the top of API routes.
 * Returns { userId, workspaceId, role } if authorized, or null if denied.
 */
export async function requirePermission(
  permission: Permission,
): Promise<{ userId: string; workspaceId: string; role: TeamRole } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return null;

  const memberInfo = await getMemberRole(user.id, workspaceId);
  if (!memberInfo) return null;

  if (!hasPermission(memberInfo.role, permission, memberInfo.permissions)) {
    return null;
  }

  return { userId: user.id, workspaceId, role: memberInfo.role };
}
