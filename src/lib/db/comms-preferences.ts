import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CommunicationPreferences, CommunicationPreferencesRow } from "@/lib/types";
import { communicationPreferencesRowToModel } from "@/lib/types";

export async function getCommsPreferences(
  workspaceId: string,
  clientId: string
): Promise<CommunicationPreferences | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("communication_preferences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !data) return null;
  return communicationPreferencesRowToModel(data as CommunicationPreferencesRow);
}

export async function getOrCreateCommsPreferences(
  workspaceId: string,
  clientId: string
): Promise<CommunicationPreferences> {
  const existing = await getCommsPreferences(workspaceId, clientId);
  if (existing) return existing;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("communication_preferences")
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      email_enabled: true,
      sms_enabled: false,
      rebook_reminder_weeks: 6,
      quiet_hours_start: null,
      quiet_hours_end: null,
    })
    .select("*")
    .single();

  if (error || !data)
    throw new Error(`Failed to create comms preferences: ${error?.message}`);
  return communicationPreferencesRowToModel(data as CommunicationPreferencesRow);
}

export async function updateCommsPreferences(
  workspaceId: string,
  clientId: string,
  params: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    rebookReminderWeeks?: number;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
  }
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.emailEnabled !== undefined) updateData.email_enabled = params.emailEnabled;
  if (params.smsEnabled !== undefined) updateData.sms_enabled = params.smsEnabled;
  if (params.rebookReminderWeeks !== undefined)
    updateData.rebook_reminder_weeks = params.rebookReminderWeeks;
  if (params.quietHoursStart !== undefined)
    updateData.quiet_hours_start = params.quietHoursStart;
  if (params.quietHoursEnd !== undefined)
    updateData.quiet_hours_end = params.quietHoursEnd;

  const { error } = await supabase
    .from("communication_preferences")
    .update(updateData)
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId);

  if (error) throw new Error(`Failed to update comms preferences: ${error.message}`);
}
