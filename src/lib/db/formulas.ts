import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Formula, FormulaRow, FormulaServiceType, FormulaStep } from "@/lib/types";
import { formulaRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

async function resolveWorkspaceId(): Promise<string | undefined> {
  const workspace = await getCurrentWorkspace();
  if (workspace) return workspace.id;
  const admin = createSupabaseAdminClient();
  const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
  return ws?.id;
}

export async function listFormulas(): Promise<Formula[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("formulas")
    .select("*")
    .eq("workspace_id", wsId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as FormulaRow[]).map(formulaRowToModel);
}

export async function getFormula(id: string): Promise<Formula | null> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("formulas")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", wsId)
    .single();

  if (error || !data) return null;
  return formulaRowToModel(data as FormulaRow);
}

export async function getFormulasForClient(clientId: string): Promise<Formula[]> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("formulas")
    .select("*")
    .eq("workspace_id", wsId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as FormulaRow[]).map(formulaRowToModel);
}

export async function createFormula(input: {
  title: string;
  serviceType: FormulaServiceType;
  colorLine?: string;
  steps?: FormulaStep[];
  notes?: string;
  tags?: string[];
  clientId?: string;
  appointmentId?: string;
}): Promise<Formula | null> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("formulas")
    .insert({
      workspace_id: wsId,
      title: input.title,
      service_type: input.serviceType,
      color_line: input.colorLine || null,
      steps: input.steps || [],
      notes: input.notes || null,
      tags: input.tags || [],
      client_id: input.clientId || null,
      appointment_id: input.appointmentId || null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return formulaRowToModel(data as FormulaRow);
}

export async function updateFormula(
  id: string,
  input: {
    title?: string;
    serviceType?: FormulaServiceType;
    colorLine?: string;
    steps?: FormulaStep[];
    notes?: string;
    tags?: string[];
    clientId?: string;
    appointmentId?: string;
  }
): Promise<Formula | null> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return null;

  const admin = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.serviceType !== undefined) updateData.service_type = input.serviceType;
  if (input.colorLine !== undefined) updateData.color_line = input.colorLine || null;
  if (input.steps !== undefined) updateData.steps = input.steps;
  if (input.notes !== undefined) updateData.notes = input.notes || null;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.clientId !== undefined) updateData.client_id = input.clientId || null;
  if (input.appointmentId !== undefined) updateData.appointment_id = input.appointmentId || null;

  const { data, error } = await admin
    .from("formulas")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", wsId)
    .select("*")
    .single();

  if (error || !data) return null;
  return formulaRowToModel(data as FormulaRow);
}

export async function deleteFormula(id: string): Promise<boolean> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return false;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("formulas")
    .delete()
    .eq("id", id)
    .eq("workspace_id", wsId);

  return !error;
}
