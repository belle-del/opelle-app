import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ColorLine, ColorLineRow,
  ColorShade, ColorShadeRow,
  TranslationOutcome, TranslationOutcomeRow,
} from "@/lib/types";
import {
  colorLineRowToModel,
  colorShadeRowToModel,
  translationOutcomeRowToModel,
} from "@/lib/types";

// ─── Color Lines ──────────────────────────────────────────────────────────

export async function listColorLines(brand?: string): Promise<(ColorLine & { shadeCount: number })[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("color_lines")
    .select("*, color_shades(count)")
    .order("brand", { ascending: true })
    .order("line_name", { ascending: true });

  if (brand) {
    query = query.eq("brand", brand);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    ...colorLineRowToModel(row as ColorLineRow),
    shadeCount: (row as any).color_shades?.[0]?.count ?? 0,
  }));
}

export async function createColorLine(input: {
  brand: string;
  lineName: string;
  type: string;
  characteristics?: Record<string, string>;
}): Promise<ColorLine | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("color_lines")
    .insert({
      brand: input.brand,
      line_name: input.lineName,
      type: input.type,
      characteristics: input.characteristics || {},
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return colorLineRowToModel(data as ColorLineRow);
}

// ─── Shades ───────────────────────────────────────────────────────────────

export async function listShades(colorLineId: string): Promise<ColorShade[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("color_shades")
    .select("*")
    .eq("color_line_id", colorLineId)
    .order("level", { ascending: true })
    .order("shade_code", { ascending: true });

  if (error || !data) return [];
  return (data as ColorShadeRow[]).map(colorShadeRowToModel);
}

export async function createShades(colorLineId: string, shades: {
  shadeCode: string;
  shadeName: string;
  level: number;
  primaryTone: string;
  secondaryTone?: string;
}[]): Promise<number> {
  const admin = createSupabaseAdminClient();
  const rows = shades.map((s) => ({
    color_line_id: colorLineId,
    shade_code: s.shadeCode,
    shade_name: s.shadeName,
    level: s.level,
    primary_tone: s.primaryTone,
    secondary_tone: s.secondaryTone || null,
  }));

  const { error, count } = await admin
    .from("color_shades")
    .upsert(rows, { onConflict: "color_line_id,shade_code", count: "exact" });

  if (error) {
    console.error("createShades error:", error.message);
    return 0;
  }
  return count ?? shades.length;
}

// ─── Translation Outcomes ─────────────────────────────────────────────────

export async function listOutcomes(workspaceId: string, options?: {
  limit?: number;
  offset?: number;
}): Promise<TranslationOutcome[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("translation_outcomes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 20) - 1);

  if (error || !data) return [];
  return (data as TranslationOutcomeRow[]).map(translationOutcomeRowToModel);
}

export async function createOutcome(input: {
  workspaceId: string;
  formulaTranslationId?: string;
  formulaHistoryId: string;
  clientId: string;
  outcomeSuccess?: boolean;
  stylistFeedback?: string;
  adjustmentNotes?: string;
}): Promise<TranslationOutcome | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("translation_outcomes")
    .insert({
      workspace_id: input.workspaceId,
      formula_translation_id: input.formulaTranslationId || null,
      formula_history_id: input.formulaHistoryId,
      client_id: input.clientId,
      outcome_success: input.outcomeSuccess ?? null,
      stylist_feedback: input.stylistFeedback || null,
      adjustment_notes: input.adjustmentNotes || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createOutcome error:", error?.message);
    return null;
  }
  return translationOutcomeRowToModel(data as TranslationOutcomeRow);
}

// ─── Stats & Data Quality ─────────────────────────────────────────────────

export async function getTranslationStats(workspaceId: string) {
  const admin = createSupabaseAdminClient();

  const [formulaCount, outcomeCount, withPhotos, withFeedback, shadeMappingCount] = await Promise.all([
    admin.from("formula_history").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    admin.from("formula_history").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("before_photo_url", "is", null),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("stylist_feedback", "is", null),
    admin.from("shade_mappings").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalFormulas: formulaCount.count ?? 0,
    totalOutcomes: outcomeCount.count ?? 0,
    formulasWithPhotos: withPhotos.count ?? 0,
    outcomesWithFeedback: withFeedback.count ?? 0,
    shadeMappings: shadeMappingCount.count ?? 0,
  };
}

export async function getDataQuality(workspaceId: string) {
  const admin = createSupabaseAdminClient();

  const [totalFormulas, withPhotos, totalOutcomes, withFeedback, withSuccess] = await Promise.all([
    admin.from("formula_history").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    admin.from("formula_history").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("before_photo_url", "is", null),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("stylist_feedback", "is", null),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("outcome_success", "is", null),
  ]);

  const tf = totalFormulas.count ?? 0;
  const to = totalOutcomes.count ?? 0;

  return {
    totalFormulas: tf,
    formulasWithPhotos: withPhotos.count ?? 0,
    photoPct: tf > 0 ? Math.round(((withPhotos.count ?? 0) / tf) * 100) : 0,
    totalOutcomes: to,
    outcomesWithFeedback: withFeedback.count ?? 0,
    feedbackPct: to > 0 ? Math.round(((withFeedback.count ?? 0) / to) * 100) : 0,
    outcomesWithRating: withSuccess.count ?? 0,
    ratingPct: to > 0 ? Math.round(((withSuccess.count ?? 0) / to) * 100) : 0,
  };
}
