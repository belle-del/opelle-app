import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserProfile, createUserProfile, completeOnboarding } from "@/lib/db/user-profiles";
import { roleToUserType } from "@/lib/role-mapping";
import { NextResponse } from "next/server";
import type { UserType } from "@/lib/types";
import type { TeamRole } from "@/lib/permissions";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const profile = await getUserProfile(user.id);

        if (profile?.onboardingCompleted) {
          // Already onboarded — go to destination
          return NextResponse.redirect(`${origin}${next}`);
        }

        // Check if this is an existing user (has a workspace or membership).
        // Prefer ownership over membership when both exist — Belle owns her
        // workspace AND is listed as an owner-member; ownership wins so she
        // gets salon_owner.
        const admin = createSupabaseAdminClient();

        const { data: ownedWorkspace } = await admin
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const { data: membership } = await admin
          .from("workspace_members")
          .select("id, role")
          .eq("user_id", user.id)
          .or("status.neq.inactive,status.is.null")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (ownedWorkspace || membership) {
          // Existing user with a workspace — auto-onboard, skip quiz.
          // Ownership wins: if the user owns a workspace, treat them as
          // salon_owner regardless of what membership row they have.
          const derivedRole: TeamRole | null = ownedWorkspace
            ? "owner"
            : (membership?.role as TeamRole | undefined) ?? null;
          const userType: UserType = derivedRole
            ? roleToUserType(derivedRole)
            : "practitioner";

          if (!profile) {
            await createUserProfile(user.id);
          }
          await completeOnboarding(user.id, userType);
          return NextResponse.redirect(`${origin}${next}`);
        }

        // Genuinely new user — no workspace, no membership
        if (!profile) {
          await createUserProfile(user.id);
        }
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
