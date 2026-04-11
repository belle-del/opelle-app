import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BrandBadgeLevel } from "@/lib/types/network";

export type BrandPartnership = {
  id: string;
  brandName: string;
  brandLogoUrl?: string;
  partnershipType: "attribution" | "sponsorship" | "intelligence";
  active: boolean;
  startedAt: string;
  createdAt: string;
};

export type BrandVerification = {
  id: string;
  brandPartnershipId: string;
  userId: string;
  usageCount: number;
  badgeLevel: BrandBadgeLevel | null;
  lastUsageDate?: string;
  sponsored: boolean;
  verifiedAt?: string;
  createdAt: string;
};

function getBadgeLevel(usageCount: number): BrandBadgeLevel {
  if (usageCount >= 500) return "ambassador";
  if (usageCount >= 200) return "expert";
  if (usageCount >= 50) return "advocate";
  return "user";
}

export async function getBrandPartnerships(): Promise<BrandPartnership[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("brand_partnerships")
    .select("*")
    .eq("active", true)
    .order("brand_name");

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    brandName: row.brand_name,
    brandLogoUrl: row.brand_logo_url ?? undefined,
    partnershipType: row.partnership_type,
    active: row.active,
    startedAt: row.started_at,
    createdAt: row.created_at,
  }));
}

export async function getUserBrandBadges(
  userId: string
): Promise<BrandVerification[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("brand_verified_stylists")
    .select("*")
    .eq("user_id", userId)
    .not("verified_at", "is", null);

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    brandPartnershipId: row.brand_partnership_id,
    userId: row.user_id,
    usageCount: row.usage_count,
    badgeLevel: row.badge_level,
    lastUsageDate: row.last_usage_date ?? undefined,
    sponsored: row.sponsored,
    verifiedAt: row.verified_at ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function updateBrandVerification(
  userId: string,
  brandPartnershipId: string,
  usageCount: number
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const badgeLevel = getBadgeLevel(usageCount);

  await admin.from("brand_verified_stylists").upsert(
    {
      brand_partnership_id: brandPartnershipId,
      user_id: userId,
      usage_count: usageCount,
      badge_level: badgeLevel,
      last_usage_date: new Date().toISOString().split("T")[0],
      verified_at: new Date().toISOString(),
    },
    { onConflict: "brand_partnership_id,user_id" }
  );
}
