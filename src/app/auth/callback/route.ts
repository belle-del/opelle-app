import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile, createUserProfile } from "@/lib/db/user-profiles";
import { NextResponse } from "next/server";

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
        // Ensure user_profiles row exists
        const profile = await getUserProfile(user.id);

        if (!profile) {
          // New user — create profile, send to onboarding
          await createUserProfile(user.id);
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        if (!profile.onboardingCompleted) {
          // Returning user who hasn't finished onboarding
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        // Onboarded user — send to their destination
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
