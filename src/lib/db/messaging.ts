import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MessageThread, MessageThreadRow, Message, MessageRow } from "@/lib/types";
import { messageThreadRowToModel, messageRowToModel } from "@/lib/types";

// ── Threads ────────────────────────────────────────────────

export async function getThreadsForWorkspace(workspaceId: string): Promise<MessageThread[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_threads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];
  return (data as MessageThreadRow[]).map(messageThreadRowToModel);
}

export async function getThreadsForClient(clientId: string): Promise<MessageThread[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_threads")
    .select("*")
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];
  return (data as MessageThreadRow[]).map(messageThreadRowToModel);
}

export async function getThread(threadId: string): Promise<MessageThread | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (error || !data) return null;
  return messageThreadRowToModel(data as MessageThreadRow);
}

export async function getOrCreateThread(
  workspaceId: string,
  clientId: string,
  subject?: string
): Promise<MessageThread> {
  const supabase = createSupabaseAdminClient();

  // Check for existing thread between workspace and client
  const { data: existing } = await supabase
    .from("message_threads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    return messageThreadRowToModel(existing[0] as MessageThreadRow);
  }

  // Create new thread
  const { data, error } = await supabase
    .from("message_threads")
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      subject: subject ?? null,
      last_message_at: new Date().toISOString(),
      unread_stylist: 0,
      unread_client: 0,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create message thread: ${error?.message}`);
  }

  return messageThreadRowToModel(data as MessageThreadRow);
}

// ── Messages ───────────────────────────────────────────────

export async function getMessagesForThread(threadId: string): Promise<Message[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as MessageRow[]).map(messageRowToModel);
}

export async function createMessage(params: {
  workspaceId: string;
  threadId: string;
  senderType: "stylist" | "client";
  senderId: string;
  body: string;
}): Promise<Message> {
  const supabase = createSupabaseAdminClient();

  // Insert the message
  const { data, error } = await supabase
    .from("messages")
    .insert({
      workspace_id: params.workspaceId,
      thread_id: params.threadId,
      sender_type: params.senderType,
      sender_id: params.senderId,
      body: params.body,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create message: ${error?.message}`);
  }

  // Update thread: bump last_message_at and increment unread counter
  const unreadField =
    params.senderType === "stylist" ? "unread_client" : "unread_stylist";

  // Fetch current unread count, then increment
  const { data: thread } = await supabase
    .from("message_threads")
    .select(unreadField)
    .eq("id", params.threadId)
    .single();

  const currentCount = thread ? (thread as Record<string, number>)[unreadField] ?? 0 : 0;

  await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      [unreadField]: currentCount + 1,
    })
    .eq("id", params.threadId);

  return messageRowToModel(data as MessageRow);
}

export async function markThreadRead(
  threadId: string,
  readerType: "stylist" | "client"
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const field =
    readerType === "stylist" ? "unread_stylist" : "unread_client";

  await supabase
    .from("message_threads")
    .update({ [field]: 0 })
    .eq("id", threadId);
}
