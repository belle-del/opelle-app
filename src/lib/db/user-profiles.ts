import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserProfile, UserProfileRow, UserType } from "@/lib/types";
import { userProfileRowToModel } from "@/lib/types";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return userProfileRowToModel(data as UserProfileRow);
}

export async function createUserProfile(userId: string): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[user-profiles] createUserProfile error:", error?.message);
    return null;
  }
  return userProfileRowToModel(data as UserProfileRow);
}

export async function completeOnboarding(
  userId: string,
  userType: UserType,
): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .update({ user_type: userType, onboarding_completed: true })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[user-profiles] completeOnboarding error:", error?.message);
    return null;
  }
  return userProfileRowToModel(data as UserProfileRow);
}

export async function getOnboardingStatus(userId: string): Promise<{
  onboardingCompleted: boolean;
  userType: UserType | null;
}> {
  const profile = await getUserProfile(userId);
  return {
    onboardingCompleted: profile?.onboardingCompleted ?? false,
    userType: profile?.userType ?? null,
  };
}
