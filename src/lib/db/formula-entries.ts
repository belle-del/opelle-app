import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormulaEntry, FormulaEntryRow, ParsedFormula } from "@/lib/types";
import { formulaEntryRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";
import { publishEvent } from "@/lib/kernel";

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

export async function listAllFormulaEntries(filters?: {
  clientId?: string;
  serviceTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<FormulaEntry[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("formula_entries")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("service_date", { ascending: false })
    .limit(300);

  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters?.serviceTypeId) {
    query = query.eq("service_type_id", filters.serviceTypeId);
  }
  if (filters?.dateFrom) {
    query = query.gte("service_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("service_date", filters.dateTo);
  }
  if (filters?.search) {
    query = query.ilike("raw_notes", `%${filters.search}%`);
  }

  const { data, error } = await query;
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
  if (!workspace) {
    console.error("FORMULA-DIAG: getCurrentWorkspace returned null");
    return null;
  }

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

  if (error || !data) {
    console.error("FORMULA-DIAG: insert error:", error?.message, error?.code, "workspace:", workspace.id);
    return null;
  }

  const entry = formulaEntryRowToModel(data as FormulaEntryRow);

  // Fire kernel event (non-blocking)
  publishEvent({
    event_type: "formula_saved",
    workspace_id: workspace.id,
    timestamp: new Date().toISOString(),
    payload: {
      formula_entry_id: entry.id,
      client_id: input.clientId,
      service_type_id: input.serviceTypeId,
      service_date: entry.serviceDate,
      raw_notes: input.rawNotes,
      parsed_formula: entry.parsedFormula,
    },
  });

  return entry;
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

  const entry = formulaEntryRowToModel(data as FormulaEntryRow);

  // Fire kernel event when formula is corrected (parsed formula changed)
  if (input.parsedFormula !== undefined) {
    publishEvent({
      event_type: "formula_corrected",
      workspace_id: workspace.id,
      timestamp: new Date().toISOString(),
      payload: {
        formula_entry_id: id,
        has_new_parsed: !!input.parsedFormula,
        service_date: input.serviceDate ?? null,
      },
    });
  }

  return entry;
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
