import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  MessageLog, MessageLogRow, AutomationRule, AutomationRuleRow,
  Campaign, CampaignRow, AudienceFilter,
} from "@/lib/types";
import {
  messageLogRowToModel, automationRuleRowToModel, campaignRowToModel,
} from "@/lib/types";

// ── Message Logs ─────────────────────────────────────────────

export async function createMessageLog(params: {
  workspaceId: string;
  clientId?: string;
  templateId?: string;
  source: string;
  channel?: string;
  subject?: string;
  body?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}): Promise<MessageLog | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("message_logs")
    .insert({
      workspace_id: params.workspaceId,
      client_id: params.clientId || null,
      template_id: params.templateId || null,
      source: params.source,
      channel: params.channel || "in_app",
      subject: params.subject || null,
      body: params.body || null,
      status: params.status || "sent",
      metadata: params.metadata || {},
    })
    .select("*")
    .single();

  if (error) {
    console.error("[marketing] createMessageLog error:", error.message);
    return null;
  }
  return messageLogRowToModel(data as MessageLogRow);
}

export async function listMessageLogs(
  workspaceId: string,
  opts?: { source?: string; clientId?: string; limit?: number; offset?: number },
): Promise<{ logs: MessageLog[]; total: number }> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("message_logs")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("sent_at", { ascending: false });

  if (opts?.source) query = query.eq("source", opts.source);
  if (opts?.clientId) query = query.eq("client_id", opts.clientId);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit || 50) - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("[marketing] listMessageLogs error:", error.message);
    return { logs: [], total: 0 };
  }
  return {
    logs: (data as MessageLogRow[]).map(messageLogRowToModel),
    total: count ?? 0,
  };
}

// ── Automation Rules ─────────────────────────────────────────

export async function listAutomationRules(workspaceId: string): Promise<AutomationRule[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("automation_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as AutomationRuleRow[]).map(automationRuleRowToModel);
}

export async function listActiveAutomationsByTrigger(
  workspaceId: string,
  trigger: string,
): Promise<AutomationRule[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("automation_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("trigger", trigger)
    .eq("active", true);

  if (error) return [];
  return (data as AutomationRuleRow[]).map(automationRuleRowToModel);
}

export async function createAutomationRule(params: {
  workspaceId: string;
  name: string;
  trigger: string;
  conditions?: Record<string, unknown>;
  templateId?: string;
  delayMinutes?: number;
}): Promise<AutomationRule | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("automation_rules")
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      trigger: params.trigger,
      conditions: params.conditions || {},
      template_id: params.templateId || null,
      delay_minutes: params.delayMinutes || 0,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[marketing] createAutomationRule error:", error.message);
    return null;
  }
  return automationRuleRowToModel(data as AutomationRuleRow);
}

export async function updateAutomationRule(
  id: string,
  workspaceId: string,
  updates: Partial<{
    name: string;
    trigger: string;
    conditions: Record<string, unknown>;
    template_id: string | null;
    delay_minutes: number;
    active: boolean;
  }>,
): Promise<AutomationRule | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("automation_rules")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) return null;
  return automationRuleRowToModel(data as AutomationRuleRow);
}

export async function deleteAutomationRule(id: string, workspaceId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("automation_rules")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  return !error;
}

// ── Campaigns ────────────────────────────────────────────────

export async function listCampaigns(workspaceId: string): Promise<Campaign[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("campaigns")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data as CampaignRow[]).map(campaignRowToModel);
}

export async function createCampaign(params: {
  workspaceId: string;
  name: string;
  templateId?: string;
  audienceFilter?: AudienceFilter;
  scheduledAt?: string;
}): Promise<Campaign | null> {
  const admin = createSupabaseAdminClient();
  const status = params.scheduledAt ? "scheduled" : "draft";
  const { data, error } = await admin
    .from("campaigns")
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      template_id: params.templateId || null,
      audience_filter: params.audienceFilter || {},
      scheduled_at: params.scheduledAt || null,
      status,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[marketing] createCampaign error:", error.message);
    return null;
  }
  return campaignRowToModel(data as CampaignRow);
}

export async function updateCampaign(
  id: string,
  workspaceId: string,
  updates: Partial<{
    name: string;
    template_id: string | null;
    audience_filter: AudienceFilter;
    scheduled_at: string | null;
    sent_at: string | null;
    status: string;
    recipients_count: number;
  }>,
): Promise<Campaign | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("campaigns")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) return null;
  return campaignRowToModel(data as CampaignRow);
}

// ── Audience Filtering ───────────────────────────────────────

export async function resolveAudience(
  workspaceId: string,
  filter: AudienceFilter,
): Promise<{ id: string; first_name: string; email: string | null }[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("clients")
    .select("id, first_name, email")
    .eq("workspace_id", workspaceId);

  // Filter by tags (client must have ALL specified tags)
  if (filter.tags && filter.tags.length > 0) {
    query = query.contains("tags", filter.tags);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Post-query filtering for visit-based criteria (requires joins not available in simple query)
  // For MVP, return all matching clients. Visit-based filtering can be added later.
  return data;
}

export async function countAudience(
  workspaceId: string,
  filter: AudienceFilter,
): Promise<number> {
  const audience = await resolveAudience(workspaceId, filter);
  return audience.length;
}
