// src/lib/db/availability.ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AvailabilityPattern,
  AvailabilityPatternRow,
  AvailabilityOverride,
  AvailabilityOverrideRow,
} from "@/lib/types";
import {
  availabilityPatternRowToModel,
  availabilityOverrideRowToModel,
} from "@/lib/types";

// --- Availability Patterns ---

export async function listAvailabilityPatterns(
  workspaceId: string,
  userId?: string
): Promise<AvailabilityPattern[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("availability_patterns")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("day_of_week", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listAvailabilityPatterns: ${error.message}`);
  return (data as AvailabilityPatternRow[]).map(availabilityPatternRowToModel);
}

export async function upsertAvailabilityPattern(
  pattern: Omit<AvailabilityPatternRow, "id" | "created_at" | "updated_at">
): Promise<AvailabilityPattern> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("availability_patterns")
    .upsert(pattern, {
      onConflict: "workspace_id,user_id,day_of_week,effective_from",
    })
    .select("*")
    .single();

  if (error) throw new Error(`upsertAvailabilityPattern: ${error.message}`);
  return availabilityPatternRowToModel(data as AvailabilityPatternRow);
}

export async function deleteAvailabilityPattern(
  id: string,
  workspaceId: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error, count } = await admin
    .from("availability_patterns")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  return !error && (count ?? 0) > 0;
}

// --- Availability Overrides ---

export async function listAvailabilityOverrides(
  workspaceId: string,
  userId: string,
  from?: string,
  to?: string
): Promise<AvailabilityOverride[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("availability_overrides")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("override_date", { ascending: true });

  if (from) query = query.gte("override_date", from);
  if (to) query = query.lte("override_date", to);

  const { data, error } = await query;
  if (error) throw new Error(`listAvailabilityOverrides: ${error.message}`);
  return (data as AvailabilityOverrideRow[]).map(availabilityOverrideRowToModel);
}

export async function upsertAvailabilityOverride(
  override: Omit<AvailabilityOverrideRow, "id" | "created_at" | "updated_at">
): Promise<AvailabilityOverride> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("availability_overrides")
    .upsert(override, {
      onConflict: "workspace_id,user_id,override_date",
    })
    .select("*")
    .single();

  if (error) throw new Error(`upsertAvailabilityOverride: ${error.message}`);
  return availabilityOverrideRowToModel(data as AvailabilityOverrideRow);
}

export async function deleteAvailabilityOverride(
  id: string,
  workspaceId: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error, count } = await admin
    .from("availability_overrides")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  return !error && (count ?? 0) > 0;
}
