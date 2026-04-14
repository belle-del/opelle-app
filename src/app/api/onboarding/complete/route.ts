import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { completeOnboarding } from "@/lib/db/user-profiles";
import { acceptTeamInvite } from "@/lib/db/team";
import { NextResponse } from "next/server";
import type { UserType } from "@/lib/types";

const VALID_TYPES: UserType[] = ["student", "practitioner", "salon_owner", "school_admin"];

function getRedirectPath(userType: UserType): string {
  switch (userType) {
    case "student":
      return "/app/calla";
    case "school_admin":
      return "/app/floor";
    case "practitioner":
    case "salon_owner":
    default:
      return "/app/dashboard";
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { user_type, invite_token } = body as {
    user_type: string;
    invite_token?: string;
  };

  if (!VALID_TYPES.includes(user_type as UserType)) {
    return NextResponse.json({ error: "Invalid user_type" }, { status: 400 });
  }

  const userType = user_type as UserType;
  const admin = createSupabaseAdminClient();
  let joinedViaInvite = false;

  // Handle invite code if provided
  if (invite_token) {
    const displayName =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Team Member";

    const { member, error } = await acceptTeamInvite(
      invite_token,
      user.id,
      displayName,
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    joinedViaInvite = true;
  }

  // Create workspace if user didn't join via invite
  if (!joinedViaInvite) {
    const name =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "My Workspace";

    // Check if user already has a workspace (edge case)
    const { data: existingWs } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!existingWs) {
      // Generate unique stylist code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let stylistCode = "";
      for (let attempt = 0; attempt < 5; attempt++) {
        let candidate = "";
        for (let i = 0; i < 6; i++) {
          candidate += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const { data } = await admin
          .from("workspaces")
          .select("id")
          .eq("stylist_code", candidate)
          .maybeSingle();
        if (!data) {
          stylistCode = candidate;
          break;
        }
      }

      const workspaceName =
        userType === "school_admin"
          ? `${name}'s School`
          : userType === "salon_owner"
            ? `${name}'s Salon`
            : `${name}'s Studio`;

      const { data: ws, error: wsError } = await admin
        .from("workspaces")
        .insert({
          owner_id: user.id,
          name: workspaceName,
          stylist_code: stylistCode,
          is_salon: userType === "salon_owner" || userType === "school_admin",
        })
        .select("id")
        .single();

      if (wsError) {
        console.error("[onboarding/complete] workspace creation error:", wsError.message);
        return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
      }

      // Create workspace_members entry for owner
      await admin
        .from("workspace_members")
        .insert({
          workspace_id: ws.id,
          user_id: user.id,
          role: "owner",
          status: "active",
        });
    }
  }

  // Mark onboarding complete
  const profile = await completeOnboarding(user.id, userType);
  if (!profile) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  const redirect = getRedirectPath(userType);
  return NextResponse.json({ redirect, user_type: userType });
}
