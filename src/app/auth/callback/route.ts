import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserProfile, createUserProfile, completeOnboarding } from "@/lib/db/user-profiles";
import { NextResponse } from "next/server";
import type { UserType } from "@/lib/types";

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

        // Check if this is an existing user (has a workspace or membership)
        const admin = createSupabaseAdminClient();

        const { data: ownedWorkspace } = await admin
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        const { data: membership } = await admin
          .from("workspace_members")
          .select("id, role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (ownedWorkspace || membership) {
          // Existing user with a workspace — auto-onboard, skip quiz
          const userType: UserType = membership?.role === "student"
            ? "student"
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
