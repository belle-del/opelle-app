import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { FormulaHistory, FormulaHistoryRow, FormulaSharingLevel } from "@/lib/types";
import { formulaHistoryRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

export async function createFormulaHistory(input: {
  clientId: string;
  serviceCompletionId?: string;
  formula: Record<string, unknown>;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  stylistNotes?: string;
  sharingLevel?: FormulaSharingLevel;
}): Promise<FormulaHistory | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("formula_history")
    .insert({
      workspace_id: workspace.id,
      client_id: input.clientId,
      service_completion_id: input.serviceCompletionId || null,
      formula: input.formula,
      before_photo_url: input.beforePhotoUrl || null,
      after_photo_url: input.afterPhotoUrl || null,
      stylist_notes: input.stylistNotes || null,
      sharing_level: input.sharingLevel || "private",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("formula_history insert error:", error?.message);
    return null;
  }

  return formulaHistoryRowToModel(data as FormulaHistoryRow);
}

export async function getFormulaHistoryForClient(
  clientId: string
): Promise<FormulaHistory[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("formula_history")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as FormulaHistoryRow[]).map(formulaHistoryRowToModel);
}

/** Client portal: returns only formulas with sharing_level allowing client view */
export async function getVisibleFormulasForClient(
  clientId: string,
  workspaceId: string
): Promise<FormulaHistory[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("formula_history")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .in("sharing_level", ["client_visible", "portable"])
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as FormulaHistoryRow[]).map(formulaHistoryRowToModel);
}

export async function updateFormulaSharing(
  id: string,
  sharingLevel: FormulaSharingLevel
): Promise<FormulaHistory | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("formula_history")
    .update({ sharing_level: sharingLevel })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return formulaHistoryRowToModel(data as FormulaHistoryRow);
}
