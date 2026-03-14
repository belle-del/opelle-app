import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const trimmed = code.trim().toUpperCase();
  const admin = createSupabaseAdminClient();

  // Check stylist code
  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, name, owner_id, stylist_code")
    .eq("stylist_code", trimmed)
    .maybeSingle();

  if (workspace) {
    // Get stylist display name
    const { data: member } = await admin
      .from("workspace_members")
      .select("display_name")
      .eq("workspace_id", workspace.id)
      .eq("user_id", workspace.owner_id)
      .maybeSingle();

    return NextResponse.json({
      type: "stylist_code",
      workspaceId: workspace.id,
      stylistId: workspace.owner_id,
      workspaceName: workspace.name,
      stylistName: member?.display_name || workspace.name,
    });
  }

  // Check salon code (future)
  const { data: salon } = await admin
    .from("workspaces")
    .select("id, name")
    .eq("salon_code", trimmed)
    .maybeSingle();

  if (salon) {
    return NextResponse.json({
      type: "salon_code",
      workspaceId: salon.id,
      workspaceName: salon.name,
    });
  }

  // Check temp booking code
  const { data: invite } = await admin
    .from("client_invites")
    .select("id, workspace_id, client_id, expires_at, used_at")
    .eq("token", trimmed)
    .maybeSingle();

  if (invite) {
    if (invite.used_at) {
      return NextResponse.json({ error: "This code has already been used" }, { status: 400 });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This code has expired" }, { status: 400 });
    }

    return NextResponse.json({
      type: "booking_code",
      workspaceId: invite.workspace_id,
      clientId: invite.client_id,
      inviteId: invite.id,
    });
  }

  return NextResponse.json(
    { error: "That code doesn't look right — check with your stylist" },
    { status: 404 }
  );
}
