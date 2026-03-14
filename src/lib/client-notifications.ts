import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationType = 'system' | 'stylist_message' | 'booking_update' | 'order_update' | 'inspo_update' | 'aftercare';

export async function createClientNotification(params: {
  workspaceId: string;
  clientId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
}) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("client_notifications")
    .insert({
      workspace_id: params.workspaceId,
      client_id: params.clientId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      action_url: params.actionUrl ?? null,
    });

  if (error) {
    console.error("Failed to create client notification:", error);
  }
}
