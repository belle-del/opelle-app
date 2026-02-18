import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormulaEntry, FormulaEntryRow, ParsedFormula } from "@/lib/types";
import { formulaEntryRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

export async function getFormulaEntriesForClient(
  clientId: string
): Promise<FormulaEntry[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formula_entries")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("client_id", clientId)
    .order("service_date", { ascending: false });

  if (error || !data) return [];
  return (data as FormulaEntryRow[]).map(formulaEntryRowToModel);
}

export async function getFormulaEntry(id: string): Promise<FormulaEntry | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formula_entries")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !data) return null;
  return formulaEntryRowToModel(data as FormulaEntryRow);
}

export async function createFormulaEntry(input: {
  clientId: string;
  serviceTypeId: string;
  rawNotes: string;
  generalNotes?: string;
  serviceDate?: string;
}): Promise<FormulaEntry | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("formula_entries")
    .insert({
      workspace_id: workspace.id,
      client_id: input.clientId,
      service_type_id: input.serviceTypeId,
      raw_notes: input.rawNotes,
      general_notes: input.generalNotes || null,
      service_date: input.serviceDate || new Date().toISOString().split("T")[0],
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return formulaEntryRowToModel(data as FormulaEntryRow);
}

export async function updateFormulaEntry(
  id: string,
  input: {
    rawNotes?: string;
    parsedFormula?: ParsedFormula | null;
    generalNotes?: string;
    serviceTypeId?: string;
    serviceDate?: string;
  }
): Promise<FormulaEntry | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const updateData: Record<string, unknown> = {};
  if (input.rawNotes !== undefined) updateData.raw_notes = input.rawNotes;
  if (input.parsedFormula !== undefined) updateData.parsed_formula = input.parsedFormula;
  if (input.generalNotes !== undefined) updateData.general_notes = input.generalNotes || null;
  if (input.serviceTypeId !== undefined) updateData.service_type_id = input.serviceTypeId;
  if (input.serviceDate !== undefined) updateData.service_date = input.serviceDate;

  const { data, error } = await supabase
    .from("formula_entries")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return formulaEntryRowToModel(data as FormulaEntryRow);
}

export async function deleteFormulaEntry(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("formula_entries")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}
