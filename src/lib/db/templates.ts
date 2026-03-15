import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MessageTemplate, MessageTemplateRow } from "@/lib/types";
import { messageTemplateRowToModel } from "@/lib/types";

export async function getTemplates(workspaceId: string): Promise<MessageTemplate[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error || !data) return [];
  return (data as MessageTemplateRow[]).map(messageTemplateRowToModel);
}

export async function getTemplate(id: string): Promise<MessageTemplate | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return messageTemplateRowToModel(data as MessageTemplateRow);
}

export async function createTemplate(params: {
  workspaceId: string;
  name: string;
  category: string;
  bodyTemplate: string;
}): Promise<MessageTemplate> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      category: params.category,
      body_template: params.bodyTemplate,
      is_system: false,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to create template: ${error?.message}`);
  return messageTemplateRowToModel(data as MessageTemplateRow);
}

export async function updateTemplate(
  id: string,
  params: { name?: string; category?: string; bodyTemplate?: string }
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.name !== undefined) updateData.name = params.name;
  if (params.category !== undefined) updateData.category = params.category;
  if (params.bodyTemplate !== undefined) updateData.body_template = params.bodyTemplate;

  const { error } = await supabase
    .from("message_templates")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(`Failed to update template: ${error.message}`);
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id)
    .eq("is_system", false);

  if (error) throw new Error(`Failed to delete template: ${error.message}`);
}

const SYSTEM_TEMPLATES = [
  {
    name: "Welcome",
    category: "welcome",
    body_template:
      "Welcome to {{stylistName}}'s client portal, {{clientName}}! We're so glad to have you. Feel free to explore your aftercare plans, book your next appointment, or send us inspiration photos anytime.",
  },
  {
    name: "Rebook Reminder",
    category: "rebook",
    body_template:
      "Hi {{clientName}}, it's been {{weeksSinceVisit}} weeks since your last visit. Ready to book your next appointment? We'd love to see you!",
  },
  {
    name: "Thank You",
    category: "thank_you",
    body_template:
      "Thank you for visiting today, {{clientName}}! It was wonderful working with you. Your aftercare plan is ready in the portal.",
  },
  {
    name: "Follow Up",
    category: "follow_up",
    body_template:
      "Hi {{clientName}}, just checking in! How is everything looking since your last appointment? Let us know if you need anything.",
  },
];

export async function seedSystemTemplates(workspaceId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();

  // Check if system templates already exist for this workspace
  const { data: existing } = await supabase
    .from("message_templates")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("is_system", true)
    .limit(1);

  if (existing && existing.length > 0) return;

  const rows = SYSTEM_TEMPLATES.map((t) => ({
    workspace_id: workspaceId,
    ...t,
    is_system: true,
  }));

  const { error } = await supabase.from("message_templates").insert(rows);

  if (error) throw new Error(`Failed to seed system templates: ${error.message}`);
}
