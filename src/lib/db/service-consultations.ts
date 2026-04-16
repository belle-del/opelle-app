import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServiceConsultation, ServiceConsultationRow, HairCondition, ScalpCondition } from "@/lib/types";
import { serviceConsultationRowToModel } from "@/lib/types";

export async function getConsultation(sessionId: string, workspaceId: string): Promise<ServiceConsultation | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_consultations")
    .select("*")
    .eq("session_id", sessionId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) return null;
  return serviceConsultationRowToModel(data as ServiceConsultationRow);
}

export async function saveConsultation(input: {
  workspaceId: string;
  sessionId: string;
  clientId: string;
  currentCondition?: HairCondition;
  scalpCondition?: ScalpCondition;
  serviceRequested?: string;
  specificRequests?: string;
  referencedInspoIds?: string[];
  stylistNotes?: string;
  recommendedServices?: string[];
  concerns?: string[];
  clientConfirmed?: boolean;
}): Promise<ServiceConsultation | null> {
  const admin = createSupabaseAdminClient();

  // Check if consultation already exists for this session
  const { data: existing } = await admin
    .from("service_consultations")
    .select("id")
    .eq("session_id", input.sessionId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();

  const now = new Date().toISOString();
  const row = {
    workspace_id: input.workspaceId,
    session_id: input.sessionId,
    client_id: input.clientId,
    current_condition: input.currentCondition || null,
    scalp_condition: input.scalpCondition || null,
    service_requested: input.serviceRequested || null,
    specific_requests: input.specificRequests || null,
    referenced_inspo_ids: input.referencedInspoIds || null,
    stylist_notes: input.stylistNotes || null,
    recommended_services: input.recommendedServices || null,
    concerns: input.concerns || null,
    client_confirmed: input.clientConfirmed || false,
    confirmed_at: input.clientConfirmed ? now : null,
    updated_at: now,
  };

  let data;
  let error;

  if (existing) {
    // Update existing
    ({ data, error } = await admin
      .from("service_consultations")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single());
  } else {
    // Insert new
    ({ data, error } = await admin
      .from("service_consultations")
      .insert(row)
      .select("*")
      .single());
  }

  if (error || !data) {
    console.error("Failed to save consultation:", error);
    return null;
  }

  const consultation = serviceConsultationRowToModel(data as ServiceConsultationRow);

  // Link consultation to session
  await admin
    .from("service_sessions")
    .update({ consultation_id: consultation.id, updated_at: now })
    .eq("id", input.sessionId)
    .eq("workspace_id", input.workspaceId);

  return consultation;
}
