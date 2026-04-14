import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/db/user-profiles";
import { OnboardingQuiz } from "./_components/OnboardingQuiz";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);

  if (profile?.onboardingCompleted) {
    switch (profile.userType) {
      case "student":
        redirect("/app/calla");
      case "school_admin":
        redirect("/app/floor");
      default:
        redirect("/app/dashboard");
    }
  }

  return <OnboardingQuiz />;
}
