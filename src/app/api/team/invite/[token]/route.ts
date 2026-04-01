import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTeamInviteByToken, acceptTeamInvite } from "@/lib/db/team";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const invite = await getTeamInviteByToken(token);

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
    }
    if (invite.acceptedAt) {
      return NextResponse.json({ error: "Invite already used" }, { status: 410 });
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    // Get workspace name for display
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const admin = createSupabaseAdminClient();
    const { data: workspace } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", invite.workspaceId)
      .single();

    return NextResponse.json({
      role: invite.role,
      workspaceName: workspace?.name ?? "Workspace",
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    console.error("[team/invite/token] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await params;
    const { displayName } = await req.json().catch(() => ({ displayName: undefined }));

    const result = await acceptTeamInvite(token, user.id, displayName || user.user_metadata?.full_name);
    if (!result.member) {
      return NextResponse.json({ error: result.error || "Failed to accept invite" }, { status: 400 });
    }

    return NextResponse.json({ member: result.member, redirectTo: "/app" });
  } catch (err) {
    console.error("[team/invite/token] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
