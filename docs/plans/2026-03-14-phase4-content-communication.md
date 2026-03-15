# Phase 4 — Content & Communication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an event-driven communication system where the app emits events, the MetisOS kernel personalizes messages via AI, and dispatches to in-app notifications, email (Resend), and SMS (Telnyx).

**Architecture:** Event-driven, kernel-native. App emits events → kernel processes → AI personalizes → dispatches to channels. Two-way messaging between stylist and client. Content publishing system. Configurable auto-triggers. All external calls route through MetisOS kernel (Immutable Rule 2).

**Tech Stack:** Next.js 16, Supabase (RLS), MetisOS kernel (Express on VPS port 3203), Resend (email), Telnyx (SMS), TypeScript

---

## Task 1: Database Migration — New Tables

**Files:**
- Create: `migrations/2026-03-14-phase4-communication.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- MIGRATION: Phase 4 — Content & Communication
-- ============================================================

-- 1. message_threads
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  subject TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_stylist INT DEFAULT 0,
  unread_client INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  thread_id UUID REFERENCES message_threads NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('stylist', 'client')),
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. communication_preferences
CREATE TABLE IF NOT EXISTS communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  rebook_reminder_weeks INT DEFAULT 6,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, client_id)
);

-- 4. message_templates
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rebook', 'thank_you', 'welcome', 'follow_up', 'custom')),
  body_template TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. content_posts
CREATE TABLE IF NOT EXISTS content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tip', 'product_spotlight', 'seasonal')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. delivery_log
CREATE TABLE IF NOT EXISTS delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  notification_id UUID REFERENCES client_notifications,
  message_id UUID REFERENCES messages,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered')),
  external_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_log ENABLE ROW LEVEL SECURITY;

-- message_threads
CREATE POLICY "stylist_manage_threads" ON message_threads
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "client_read_own_threads" ON message_threads
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_update_own_threads" ON message_threads
  FOR UPDATE USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));

-- messages
CREATE POLICY "stylist_manage_messages" ON messages
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "client_read_own_messages" ON messages
  FOR SELECT USING (thread_id IN (
    SELECT id FROM message_threads WHERE client_id IN (
      SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()
    )
  ));
CREATE POLICY "client_insert_own_messages" ON messages
  FOR INSERT WITH CHECK (
    sender_type = 'client' AND
    thread_id IN (
      SELECT id FROM message_threads WHERE client_id IN (
        SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- communication_preferences
CREATE POLICY "stylist_manage_comms_prefs" ON communication_preferences
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "client_read_own_comms_prefs" ON communication_preferences
  FOR SELECT USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "client_update_own_comms_prefs" ON communication_preferences
  FOR UPDATE USING (client_id IN (SELECT client_id FROM client_users WHERE auth_user_id = auth.uid()));

-- message_templates
CREATE POLICY "stylist_manage_templates" ON message_templates
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- content_posts (clients read published only)
CREATE POLICY "stylist_manage_content" ON content_posts
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "client_read_published_content" ON content_posts
  FOR SELECT USING (
    published_at IS NOT NULL AND
    workspace_id IN (SELECT workspace_id FROM client_users WHERE auth_user_id = auth.uid())
  );

-- delivery_log (stylist only)
CREATE POLICY "stylist_read_delivery_log" ON delivery_log
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_message_threads_workspace ON message_threads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_client ON message_threads(client_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_msg ON message_threads(workspace_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comms_prefs_client ON communication_preferences(workspace_id, client_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_workspace ON message_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_workspace ON content_posts(workspace_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_message ON delivery_log(message_id);

-- ============================================================
-- SEED: System Message Templates
-- ============================================================
-- Note: These use workspace_id = NULL trick won't work with FK.
-- Instead, seed per-workspace on first use via app code.
```

**Step 2: Run migration against Supabase**

Run: `Apply via Supabase dashboard SQL editor (project qccrfgkfcdcezxzdtfpk)`

**Step 3: Commit**

```bash
git add migrations/2026-03-14-phase4-communication.sql
git commit -m "feat: add Phase 4 communication tables migration"
```

---

## Task 2: TypeScript Types & Row Converters

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add new types to `src/lib/types.ts`**

Add after the existing `ClientNotification` type block (~line 684):

```typescript
// ── Two-Way Messaging ────────────────────────────────────────

export type MessageThread = {
  id: string
  workspaceId: string
  clientId: string
  subject?: string
  lastMessageAt: string
  unreadStylist: number
  unreadClient: number
  createdAt: string
}

export type Message = {
  id: string
  workspaceId: string
  threadId: string
  senderType: 'stylist' | 'client'
  senderId: string
  body: string
  createdAt: string
}

// ── Communication Preferences ────────────────────────────────

export type CommunicationPreferences = {
  id: string
  workspaceId: string
  clientId: string
  emailEnabled: boolean
  smsEnabled: boolean
  rebookReminderWeeks: number
  quietHoursStart?: string
  quietHoursEnd?: string
  createdAt: string
  updatedAt: string
}

// ── Message Templates ────────────────────────────────────────

export type TemplateCategory = 'rebook' | 'thank_you' | 'welcome' | 'follow_up' | 'custom'

export type MessageTemplate = {
  id: string
  workspaceId: string
  name: string
  category: TemplateCategory
  bodyTemplate: string
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

// ── Content Posts ────────────────────────────────────────────

export type ContentCategory = 'tip' | 'product_spotlight' | 'seasonal'

export type ContentPost = {
  id: string
  workspaceId: string
  title: string
  body: string
  category: ContentCategory
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

// ── Delivery Log ─────────────────────────────────────────────

export type DeliveryChannel = 'in_app' | 'email' | 'sms'
export type DeliveryStatus = 'sent' | 'failed' | 'delivered'

export type DeliveryLogEntry = {
  id: string
  workspaceId: string
  notificationId?: string
  messageId?: string
  channel: DeliveryChannel
  status: DeliveryStatus
  externalId?: string
  error?: string
  sentAt: string
}
```

**Step 2: Add Row types**

Add after the existing row types section:

```typescript
// ── Row Types for Phase 4 Tables ─────────────────────────────

export type MessageThreadRow = {
  id: string
  workspace_id: string
  client_id: string
  subject: string | null
  last_message_at: string
  unread_stylist: number
  unread_client: number
  created_at: string
}

export type MessageRow = {
  id: string
  workspace_id: string
  thread_id: string
  sender_type: string
  sender_id: string
  body: string
  created_at: string
}

export type CommunicationPreferencesRow = {
  id: string
  workspace_id: string
  client_id: string
  email_enabled: boolean
  sms_enabled: boolean
  rebook_reminder_weeks: number
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  created_at: string
  updated_at: string
}

export type MessageTemplateRow = {
  id: string
  workspace_id: string
  name: string
  category: string
  body_template: string
  is_system: boolean
  created_at: string
  updated_at: string
}

export type ContentPostRow = {
  id: string
  workspace_id: string
  title: string
  body: string
  category: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export type DeliveryLogRow = {
  id: string
  workspace_id: string
  notification_id: string | null
  message_id: string | null
  channel: string
  status: string
  external_id: string | null
  error: string | null
  sent_at: string
}
```

**Step 3: Add Row-to-Model converters**

```typescript
export function messageThreadRowToModel(row: MessageThreadRow): MessageThread {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    subject: row.subject ?? undefined,
    lastMessageAt: row.last_message_at,
    unreadStylist: row.unread_stylist,
    unreadClient: row.unread_client,
    createdAt: row.created_at,
  }
}

export function messageRowToModel(row: MessageRow): Message {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    threadId: row.thread_id,
    senderType: row.sender_type as Message['senderType'],
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }
}

export function communicationPreferencesRowToModel(row: CommunicationPreferencesRow): CommunicationPreferences {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    emailEnabled: row.email_enabled,
    smsEnabled: row.sms_enabled,
    rebookReminderWeeks: row.rebook_reminder_weeks,
    quietHoursStart: row.quiet_hours_start ?? undefined,
    quietHoursEnd: row.quiet_hours_end ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function messageTemplateRowToModel(row: MessageTemplateRow): MessageTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    category: row.category as TemplateCategory,
    bodyTemplate: row.body_template,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function contentPostRowToModel(row: ContentPostRow): ContentPost {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    body: row.body,
    category: row.category as ContentCategory,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add Phase 4 types and row converters"
```

---

## Task 3: Data Access Layer — Messaging

**Files:**
- Create: `src/lib/db/messaging.ts`

**Step 1: Create messaging data access functions**

```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  MessageThread, MessageThreadRow, messageThreadRowToModel,
  Message, MessageRow, messageRowToModel,
} from "@/lib/types";

// --- Threads ---

export async function getThreadsForWorkspace(workspaceId: string): Promise<MessageThread[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("message_threads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];
  return data.map(messageThreadRowToModel);
}

export async function getThreadsForClient(clientId: string): Promise<MessageThread[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("message_threads")
    .select("*")
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false });

  if (error || !data) return [];
  return data.map(messageThreadRowToModel);
}

export async function getThread(threadId: string): Promise<MessageThread | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("message_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (error || !data) return null;
  return messageThreadRowToModel(data);
}

export async function getOrCreateThread(
  workspaceId: string,
  clientId: string,
  subject?: string
): Promise<MessageThread> {
  const admin = createSupabaseAdminClient();

  // Check for existing thread
  const { data: existing } = await admin
    .from("message_threads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return messageThreadRowToModel(existing);

  // Create new
  const { data, error } = await admin
    .from("message_threads")
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      subject: subject ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create thread: ${error.message}`);
  return messageThreadRowToModel(data);
}

// --- Messages ---

export async function getMessagesForThread(threadId: string): Promise<Message[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(messageRowToModel);
}

export async function createMessage(params: {
  workspaceId: string;
  threadId: string;
  senderType: 'stylist' | 'client';
  senderId: string;
  body: string;
}): Promise<Message> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("messages")
    .insert({
      workspace_id: params.workspaceId,
      thread_id: params.threadId,
      sender_type: params.senderType,
      sender_id: params.senderId,
      body: params.body,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create message: ${error.message}`);

  // Update thread last_message_at and unread counts
  const unreadField = params.senderType === 'stylist' ? 'unread_client' : 'unread_stylist';
  await admin.rpc('increment_field', {
    table_name: 'message_threads',
    row_id: params.threadId,
    field_name: unreadField,
  }).catch(() => {
    // Fallback: manual update if RPC doesn't exist
    // Will be handled by direct SQL update
  });

  await admin
    .from("message_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.threadId);

  return messageRowToModel(data);
}

export async function markThreadRead(threadId: string, readerType: 'stylist' | 'client') {
  const admin = createSupabaseAdminClient();
  const field = readerType === 'stylist' ? 'unread_stylist' : 'unread_client';
  await admin
    .from("message_threads")
    .update({ [field]: 0 })
    .eq("id", threadId);
}
```

**Step 2: Commit**

```bash
git add src/lib/db/messaging.ts
git commit -m "feat: add messaging data access layer"
```

---

## Task 4: Data Access Layer — Content, Templates, Preferences

**Files:**
- Create: `src/lib/db/content.ts`
- Create: `src/lib/db/templates.ts`
- Create: `src/lib/db/comms-preferences.ts`

**Step 1: Create content data access**

`src/lib/db/content.ts`:
```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { contentPostRowToModel, type ContentPost } from "@/lib/types";

export async function getPublishedContent(workspaceId: string): Promise<ContentPost[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("content_posts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  return (data || []).map(contentPostRowToModel);
}

export async function getAllContent(workspaceId: string): Promise<ContentPost[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("content_posts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  return (data || []).map(contentPostRowToModel);
}

export async function getContentPost(id: string): Promise<ContentPost | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .single();
  return data ? contentPostRowToModel(data) : null;
}

export async function createContentPost(params: {
  workspaceId: string;
  title: string;
  body: string;
  category: 'tip' | 'product_spotlight' | 'seasonal';
  publish?: boolean;
}): Promise<ContentPost> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("content_posts")
    .insert({
      workspace_id: params.workspaceId,
      title: params.title,
      body: params.body,
      category: params.category,
      published_at: params.publish ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create content: ${error.message}`);
  return contentPostRowToModel(data);
}

export async function updateContentPost(id: string, params: {
  title?: string;
  body?: string;
  category?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("content_posts").update({
    ...params,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function publishContentPost(id: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("content_posts").update({
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
}
```

**Step 2: Create templates data access**

`src/lib/db/templates.ts`:
```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { messageTemplateRowToModel, type MessageTemplate } from "@/lib/types";

export async function getTemplates(workspaceId: string): Promise<MessageTemplate[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("message_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("is_system", { ascending: false })
    .order("name");
  return (data || []).map(messageTemplateRowToModel);
}

export async function getTemplate(id: string): Promise<MessageTemplate | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("message_templates")
    .select("*")
    .eq("id", id)
    .single();
  return data ? messageTemplateRowToModel(data) : null;
}

export async function createTemplate(params: {
  workspaceId: string;
  name: string;
  category: string;
  bodyTemplate: string;
}): Promise<MessageTemplate> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("message_templates")
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      category: params.category,
      body_template: params.bodyTemplate,
      is_system: false,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create template: ${error.message}`);
  return messageTemplateRowToModel(data);
}

export async function updateTemplate(id: string, params: {
  name?: string;
  category?: string;
  bodyTemplate?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.name) update.name = params.name;
  if (params.category) update.category = params.category;
  if (params.bodyTemplate) update.body_template = params.bodyTemplate;
  await admin.from("message_templates").update(update).eq("id", id);
}

export async function deleteTemplate(id: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("message_templates").delete().eq("id", id).eq("is_system", false);
}

export async function seedSystemTemplates(workspaceId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("message_templates")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("is_system", true)
    .limit(1);

  if (existing && existing.length > 0) return;

  const templates = [
    { name: "Welcome", category: "welcome", body_template: "Welcome to {{stylistName}}'s client portal, {{clientName}}! We're so glad to have you. Feel free to explore your aftercare plans, book your next appointment, or send us inspiration photos anytime." },
    { name: "Rebook Reminder", category: "rebook", body_template: "Hi {{clientName}}, it's been {{weeksSinceVisit}} weeks since your last visit. Ready to book your next appointment? We'd love to see you!" },
    { name: "Thank You", category: "thank_you", body_template: "Thank you for visiting today, {{clientName}}! It was wonderful working with you. Your aftercare plan is ready in the portal." },
    { name: "Follow Up", category: "follow_up", body_template: "Hi {{clientName}}, just checking in! How is everything looking since your last appointment? Let us know if you need anything." },
  ];

  await admin.from("message_templates").insert(
    templates.map(t => ({ ...t, workspace_id: workspaceId, is_system: true }))
  );
}
```

**Step 3: Create comms preferences data access**

`src/lib/db/comms-preferences.ts`:
```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { communicationPreferencesRowToModel, type CommunicationPreferences } from "@/lib/types";

export async function getCommsPreferences(
  workspaceId: string,
  clientId: string
): Promise<CommunicationPreferences | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("communication_preferences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .maybeSingle();
  return data ? communicationPreferencesRowToModel(data) : null;
}

export async function getOrCreateCommsPreferences(
  workspaceId: string,
  clientId: string
): Promise<CommunicationPreferences> {
  const existing = await getCommsPreferences(workspaceId, clientId);
  if (existing) return existing;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("communication_preferences")
    .insert({ workspace_id: workspaceId, client_id: clientId })
    .select()
    .single();
  if (error) throw new Error(`Failed to create comms prefs: ${error.message}`);
  return communicationPreferencesRowToModel(data);
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
  const admin = createSupabaseAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.emailEnabled !== undefined) update.email_enabled = params.emailEnabled;
  if (params.smsEnabled !== undefined) update.sms_enabled = params.smsEnabled;
  if (params.rebookReminderWeeks !== undefined) update.rebook_reminder_weeks = params.rebookReminderWeeks;
  if (params.quietHoursStart !== undefined) update.quiet_hours_start = params.quietHoursStart;
  if (params.quietHoursEnd !== undefined) update.quiet_hours_end = params.quietHoursEnd;
  await admin
    .from("communication_preferences")
    .update(update)
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId);
}
```

**Step 4: Commit**

```bash
git add src/lib/db/content.ts src/lib/db/templates.ts src/lib/db/comms-preferences.ts
git commit -m "feat: add data access for content, templates, and comms preferences"
```

---

## Task 5: Kernel Integration — Comms Dispatch

**Files:**
- Modify: `src/lib/kernel.ts`

**Step 1: Add comms dispatch function to kernel.ts**

Add after the existing `getInventoryPredictions` function:

```typescript
// --- COMMUNICATION DISPATCH (Phase 4) ---

export type CommsDispatchPayload = {
  event: string;
  workspace_id: string;
  client_id: string;
  context: Record<string, unknown>;
  template_id?: string;
  body?: string;
};

export type CommsDispatchResult = {
  notification_id?: string;
  email_sent: boolean;
  sms_sent: boolean;
  personalized_body?: string;
};

export async function dispatchComms(
  payload: CommsDispatchPayload
): Promise<CommsDispatchResult | null> {
  return kernelPost("/api/v1/comms/dispatch", payload, 15000);
}

export async function personalizeMessage(params: {
  template: string;
  client_name: string;
  context: Record<string, unknown>;
}): Promise<{ personalized: string } | null> {
  return kernelPost("/api/v1/comms/personalize", params, 10000);
}
```

**Step 2: Commit**

```bash
git add src/lib/kernel.ts
git commit -m "feat: add kernel comms dispatch integration"
```

---

## Task 6: VPS Kernel — Comms Routes

**IMPORTANT:** SSH to VPS (`ssh metis-vps`) and edit `/root/MetisOS-opelle/src/api/routes/saas.js`

**Step 1: Install Resend and Telnyx on VPS**

```bash
ssh metis-vps
cd /root/MetisOS-opelle
npm install resend telnyx
```

**Step 2: Add comms routes to saas.js**

Add the following routes to the existing saas.js file (after the AI routes):

```javascript
// ── COMMS DISPATCH (Phase 4) ─────────────────────────────────

// Main dispatch endpoint — receives event, personalizes, delivers
router.post('/comms/dispatch', async (req, res) => {
  try {
    const { event, workspace_id, client_id, context, template_id, body } = req.body;

    // 1. Get client preferences from Supabase
    const { data: prefs } = await supabase
      .from('communication_preferences')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('client_id', client_id)
      .maybeSingle();

    // 2. Get client details
    const { data: client } = await supabase
      .from('clients')
      .select('first_name, last_name, email, phone')
      .eq('id', client_id)
      .single();

    if (!client) return res.status(404).json({ error: 'Client not found' });

    // 3. Personalize message if template or needs AI
    let personalizedBody = body || '';
    if (!body && template_id) {
      const { data: template } = await supabase
        .from('message_templates')
        .select('body_template')
        .eq('id', template_id)
        .single();
      if (template) {
        personalizedBody = template.body_template
          .replace(/\{\{clientName\}\}/g, client.first_name)
          .replace(/\{\{stylistName\}\}/g, context.stylistName || 'your stylist');
        // Fill remaining variables from context
        for (const [key, val] of Object.entries(context)) {
          personalizedBody = personalizedBody.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
            String(val)
          );
        }
      }
    } else if (!body) {
      // AI personalization for auto-triggers
      const aiResult = await personalizeViaAI(event, client, context);
      personalizedBody = aiResult || `Update from your stylist regarding ${event}`;
    }

    // 4. Always create in-app notification
    const notifType = mapEventToNotificationType(event);
    const { data: notification } = await supabase
      .from('client_notifications')
      .insert({
        workspace_id,
        client_id,
        type: notifType,
        title: context.title || personalizedBody.substring(0, 80),
        body: personalizedBody,
        action_url: context.action_url || null,
      })
      .select()
      .single();

    let emailSent = false;
    let smsSent = false;

    // 5. Check quiet hours
    const inQuietHours = prefs && isInQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end);

    // 6. Email dispatch
    if (prefs?.email_enabled && client.email && !inQuietHours) {
      try {
        await sendEmail(client.email, context.title || 'Update from Opelle', personalizedBody);
        emailSent = true;
        await logDelivery(supabase, workspace_id, notification?.id, null, 'email', 'sent');
      } catch (err) {
        await logDelivery(supabase, workspace_id, notification?.id, null, 'email', 'failed', err.message);
      }
    }

    // 7. SMS dispatch
    if (prefs?.sms_enabled && client.phone && !inQuietHours) {
      try {
        await sendSMS(client.phone, personalizedBody);
        smsSent = true;
        await logDelivery(supabase, workspace_id, notification?.id, null, 'sms', 'sent');
      } catch (err) {
        await logDelivery(supabase, workspace_id, notification?.id, null, 'sms', 'failed', err.message);
      }
    }

    // Log in-app delivery
    await logDelivery(supabase, workspace_id, notification?.id, null, 'in_app', 'sent');

    res.json({
      notification_id: notification?.id,
      email_sent: emailSent,
      sms_sent: smsSent,
      personalized_body: personalizedBody,
    });
  } catch (err) {
    console.error('Comms dispatch error:', err);
    res.status(500).json({ error: 'Dispatch failed' });
  }
});

// Personalize endpoint (standalone)
router.post('/comms/personalize', async (req, res) => {
  try {
    const { template, client_name, context } = req.body;
    let personalized = template.replace(/\{\{clientName\}\}/g, client_name);
    for (const [key, val] of Object.entries(context)) {
      personalized = personalized.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        String(val)
      );
    }
    res.json({ personalized });
  } catch (err) {
    res.status(500).json({ error: 'Personalization failed' });
  }
});

// Send email endpoint
router.post('/comms/send-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    await sendEmail(to, subject, body);
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: 'Email failed', details: err.message });
  }
});

// Send SMS endpoint
router.post('/comms/send-sms', async (req, res) => {
  try {
    const { to, body } = req.body;
    await sendSMS(to, body);
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: 'SMS failed', details: err.message });
  }
});

// Templates CRUD
router.get('/comms/templates', async (req, res) => {
  const { workspace_id } = req.query;
  const { data } = await supabase
    .from('message_templates')
    .select('*')
    .eq('workspace_id', workspace_id)
    .order('is_system', { ascending: false });
  res.json({ templates: data || [] });
});

// ── HELPER FUNCTIONS ─────────────────────────────────────────

async function sendEmail(to, subject, body) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email');
    return;
  }
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@opelle.app',
    to,
    subject,
    text: body,
  });
}

async function sendSMS(to, body) {
  const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);
  if (!process.env.TELNYX_API_KEY) {
    console.warn('TELNYX_API_KEY not set, skipping SMS');
    return;
  }
  await telnyx.messages.create({
    from: process.env.TELNYX_FROM_NUMBER,
    to,
    text: body,
  });
}

async function personalizeViaAI(event, client, context) {
  try {
    const prompt = `You are a warm, professional hair stylist assistant. Generate a short, personalized notification message for the client "${client.first_name}" about: ${event}. Context: ${JSON.stringify(context)}. Keep it under 160 characters for SMS compatibility. Be warm but concise.`;

    // Use the kernel's existing Anthropic driver
    const anthropic = kernel.getDriver('anthropic');
    const result = await anthropic.chat({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    });
    return result?.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

function mapEventToNotificationType(event) {
  const map = {
    'aftercare.published': 'aftercare',
    'rebook.reminder': 'system',
    'order.status_changed': 'order_update',
    'inspo.reviewed': 'inspo_update',
    'appointment.confirmed': 'booking_update',
    'appointment.changed': 'booking_update',
    'content.published': 'system',
    'message.sent': 'stylist_message',
    'client.welcome': 'system',
  };
  return map[event] || 'system';
}

function isInQuietHours(start, end) {
  if (!start || !end) return false;
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes();
  const current = hours * 60 + mins;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (startMins <= endMins) {
    return current >= startMins && current <= endMins;
  }
  return current >= startMins || current <= endMins;
}

async function logDelivery(supabase, workspaceId, notifId, msgId, channel, status, error) {
  await supabase.from('delivery_log').insert({
    workspace_id: workspaceId,
    notification_id: notifId || null,
    message_id: msgId || null,
    channel,
    status,
    error: error || null,
  });
}
```

**Step 3: Restart kernel**

```bash
pm2 restart MetisOS-opelle
```

**Step 4: Test comms routes**

```bash
curl -s -X POST https://opelle.dominusfoundry.com/api/v1/comms/personalize \
  -H "Content-Type: application/json" \
  -H "X-Kernel-Auth: $KERNEL_KEY" \
  -d '{"template":"Hi {{clientName}}!","client_name":"Test","context":{}}' | jq
```

Expected: `{ "personalized": "Hi Test!" }`

---

## Task 7: App API Routes — Messaging

**Files:**
- Create: `src/app/api/messages/send/route.ts`
- Create: `src/app/api/messages/threads/route.ts`
- Create: `src/app/api/messages/threads/[threadId]/route.ts`
- Create: `src/app/api/messages/threads/[threadId]/read/route.ts`
- Create: `src/app/api/client/messages/[threadId]/route.ts`
- Create: `src/app/api/client/messages/reply/route.ts`

**Step 1: Create stylist send message route**

`src/app/api/messages/send/route.ts` — handles stylist composing a message. Creates/finds thread, creates message record, dispatches via kernel.

**Step 2: Create threads list route**

`src/app/api/messages/threads/route.ts` — GET returns all threads for workspace, with client name joined.

**Step 3: Create thread detail route**

`src/app/api/messages/threads/[threadId]/route.ts` — GET returns thread + messages.

**Step 4: Create mark-read route**

`src/app/api/messages/threads/[threadId]/read/route.ts` — POST marks thread read for stylist.

**Step 5: Create client thread detail route**

`src/app/api/client/messages/[threadId]/route.ts` — GET returns messages for a thread (client-scoped).

**Step 6: Create client reply route**

`src/app/api/client/messages/reply/route.ts` — POST creates client reply message, emits event to kernel.

**Step 7: Commit**

```bash
git add src/app/api/messages/ src/app/api/client/messages/
git commit -m "feat: add messaging API routes for stylist and client"
```

---

## Task 8: App API Routes — Content & Templates

**Files:**
- Create: `src/app/api/content/route.ts` (GET list, POST create)
- Create: `src/app/api/content/[id]/route.ts` (GET, PUT, DELETE)
- Create: `src/app/api/content/[id]/publish/route.ts` (POST)
- Create: `src/app/api/templates/route.ts` (GET list, POST create)
- Create: `src/app/api/templates/[id]/route.ts` (GET, PUT, DELETE)
- Create: `src/app/api/client/content/route.ts` (GET published content)
- Create: `src/app/api/client/content/[id]/route.ts` (GET single post)
- Create: `src/app/api/client/preferences/route.ts` (GET, PUT comms prefs)

**Step 1:** Implement each route following existing patterns (auth check → db query → json response).

**Step 2: Commit**

```bash
git add src/app/api/content/ src/app/api/templates/ src/app/api/client/content/ src/app/api/client/preferences/
git commit -m "feat: add content, templates, and preferences API routes"
```

---

## Task 9: Auto-Trigger Event Emitters

**Files:**
- Create: `src/lib/comms-events.ts`
- Modify: `src/app/api/inspo/[id]/review/route.ts` (emit `inspo.reviewed`)
- Modify: existing appointment/order routes to emit events

**Step 1: Create centralized event emitter helper**

`src/lib/comms-events.ts`:
```typescript
import { dispatchComms, publishEvent } from "@/lib/kernel";

export async function emitCommsEvent(params: {
  event: string;
  workspaceId: string;
  clientId: string;
  context: Record<string, unknown>;
  templateId?: string;
  body?: string;
}) {
  // Fire-and-forget dispatch through kernel
  dispatchComms({
    event: params.event,
    workspace_id: params.workspaceId,
    client_id: params.clientId,
    context: params.context,
    template_id: params.templateId,
    body: params.body,
  }).catch((err) => {
    console.error(`Failed to dispatch comms event ${params.event}:`, err);
  });
}
```

**Step 2: Wire into existing routes**

Add `emitCommsEvent` calls to existing API routes at the appropriate points:
- After inspo review → emit `inspo.reviewed`
- After appointment create/update → emit `appointment.confirmed` / `appointment.changed`
- After product order status update → emit `order.status_changed`

**Step 3: Commit**

```bash
git add src/lib/comms-events.ts src/app/api/inspo/ src/app/api/appointments/
git commit -m "feat: add auto-trigger event emitters to existing routes"
```

---

## Task 10: Rebook Reminder Cron

**Files:**
- Create: `src/app/api/cron/rebook-reminders/route.ts`
- Modify: `vercel.json` (add cron config)

**Step 1: Create rebook reminder cron route**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { emitCommsEvent } from "@/lib/comms-events";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  // Get all clients with comms prefs
  const { data: prefs } = await admin
    .from("communication_preferences")
    .select("workspace_id, client_id, rebook_reminder_weeks")
    .gt("rebook_reminder_weeks", 0);

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ checked: 0, reminders_sent: 0 });
  }

  let remindersSent = 0;

  for (const pref of prefs) {
    // Get last completed appointment
    const { data: lastAppt } = await admin
      .from("appointments")
      .select("start_at, service_name")
      .eq("client_id", pref.client_id)
      .eq("status", "completed")
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastAppt) continue;

    const lastVisitDate = new Date(lastAppt.start_at);
    const daysSince = Math.floor(
      (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const thresholdDays = pref.rebook_reminder_weeks * 7;

    // Check if no upcoming appointment exists
    const { data: upcoming } = await admin
      .from("appointments")
      .select("id")
      .eq("client_id", pref.client_id)
      .eq("status", "scheduled")
      .gt("start_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (daysSince >= thresholdDays && !upcoming) {
      const { data: client } = await admin
        .from("clients")
        .select("first_name")
        .eq("id", pref.client_id)
        .single();

      await emitCommsEvent({
        event: "rebook.reminder",
        workspaceId: pref.workspace_id,
        clientId: pref.client_id,
        context: {
          clientName: client?.first_name || "there",
          daysSinceLastVisit: daysSince,
          weeksSinceVisit: Math.floor(daysSince / 7),
          lastServiceName: lastAppt.service_name,
          lastServiceDate: lastAppt.start_at,
          title: "Time for your next appointment?",
        },
      });
      remindersSent++;
    }
  }

  return NextResponse.json({ checked: prefs.length, reminders_sent: remindersSent });
}
```

**Step 2: Add to vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/rebook-reminders",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Step 3: Commit**

```bash
git add src/app/api/cron/ vercel.json
git commit -m "feat: add daily rebook reminder cron job"
```

---

## Task 11: Stylist Console — Messages Inbox Page

**Files:**
- Create: `src/app/app/messages/page.tsx`
- Create: `src/app/app/messages/_components/ThreadList.tsx`
- Modify: `src/app/app/_components/AppNav.tsx` (add Messages nav item)

**Step 1: Add Messages to nav**

In `AppNav.tsx`, add to the "Practice" section items array:

```typescript
{ href: "/app/messages", label: "Messages", icon: MessageCircle },
```

Import `MessageCircle` from `lucide-react`.

**Step 2: Create Messages inbox page**

Server component that fetches all threads with client names, renders `ThreadList`.

**Step 3: Create ThreadList component**

Client component showing threads sorted by recent, with unread badges, client name, last message preview, relative timestamp. Style consistent with existing Opelle design system (stone/brass/bark colors, Fraunces headings, DM Sans body).

**Step 4: Commit**

```bash
git add src/app/app/messages/ src/app/app/_components/AppNav.tsx
git commit -m "feat: add stylist messages inbox page"
```

---

## Task 12: Stylist Console — Thread View & Compose

**Files:**
- Create: `src/app/app/messages/[threadId]/page.tsx`
- Create: `src/app/app/messages/[threadId]/_components/ThreadView.tsx`
- Create: `src/app/app/messages/_components/ComposeDialog.tsx`

**Step 1: Create thread detail page**

Server component that fetches thread + messages + client info. Marks thread as read for stylist.

**Step 2: Create ThreadView component**

Client component with:
- Chat-style message bubbles (stylist right, client left)
- Reply input at bottom
- Sends via POST /api/messages/send

**Step 3: Create ComposeDialog component**

Modal dialog for composing new messages:
- Client picker (dropdown of workspace clients)
- Template picker (optional — loads templates, fills in preview)
- Freeform text area
- Preview before send
- Send button

Add compose button to inbox page and to client detail page.

**Step 4: Commit**

```bash
git add src/app/app/messages/
git commit -m "feat: add thread view and compose dialog"
```

---

## Task 13: Stylist Console — Content Editor

**Files:**
- Create: `src/app/app/content/page.tsx`
- Create: `src/app/app/content/_components/ContentList.tsx`
- Create: `src/app/app/content/new/page.tsx`
- Create: `src/app/app/content/new/_components/ContentEditor.tsx`
- Create: `src/app/app/content/[id]/edit/page.tsx`
- Modify: `src/app/app/_components/AppNav.tsx` (add Content nav item)

**Step 1: Add Content to nav**

In `AppNav.tsx`, add to the "Practice" section:

```typescript
{ href: "/app/content", label: "Content", icon: FileText },
```

**Step 2: Create content list page**

Shows all content posts (published + drafts). Card layout with title, category badge, status (published/draft), date.

**Step 3: Create content editor**

Form with:
- Title input
- Category select (tip, product_spotlight, seasonal)
- Body textarea (rich-ish — support line breaks)
- Save as Draft / Publish buttons
- On publish: emits `content.published` event via kernel

**Step 4: Create edit page**

Same editor, pre-filled with existing content.

**Step 5: Commit**

```bash
git add src/app/app/content/ src/app/app/_components/AppNav.tsx
git commit -m "feat: add content editor and list pages"
```

---

## Task 14: Stylist Console — Templates Manager

**Files:**
- Create: `src/app/app/settings/templates/page.tsx`
- Create: `src/app/app/settings/templates/_components/TemplatesList.tsx`
- Create: `src/app/app/settings/templates/_components/TemplateEditor.tsx`

**Step 1: Create templates page**

Settings sub-page showing system templates (read-only) and custom templates (editable). Each template shows name, category, preview of body.

**Step 2: Create template editor**

Inline or modal editor for creating/editing custom templates. Shows available variables ({{clientName}}, {{stylistName}}, {{weeksSinceVisit}}, etc.).

**Step 3: Seed system templates on first load**

Call `seedSystemTemplates(workspaceId)` from the page's server component if no system templates exist.

**Step 4: Commit**

```bash
git add src/app/app/settings/templates/
git commit -m "feat: add message templates manager"
```

---

## Task 15: Stylist Console — Client Comms Preferences

**Files:**
- Modify: `src/app/app/clients/[id]/edit/page.tsx` or client edit form
- Create: `src/app/app/clients/[id]/_components/CommsPrefsSection.tsx`

**Step 1: Add comms preferences section to client edit**

Section with:
- Rebook reminder weeks (number input, default 6)
- Email enabled toggle (read from prefs)
- SMS enabled toggle (read from prefs)
- Quiet hours start/end (time inputs)

**Step 2: Commit**

```bash
git add src/app/app/clients/
git commit -m "feat: add comms preferences to client edit page"
```

---

## Task 16: Stylist Console — Client Messages Tab

**Files:**
- Modify: `src/app/app/clients/[id]/page.tsx`
- Create: `src/app/app/clients/[id]/_components/ClientMessagesTab.tsx`

**Step 1: Add Messages tab to client detail page**

Shows thread history for this client inline. Compose button to start new conversation. Uses same ThreadView component from Task 12.

**Step 2: Commit**

```bash
git add src/app/app/clients/
git commit -m "feat: add messages tab to client detail page"
```

---

## Task 17: Client Portal — Upgrade Messages Page

**Files:**
- Modify: `src/app/client/(portal)/messages/page.tsx`
- Modify: `src/app/client/(portal)/messages/_components/MessagesFeed.tsx`
- Create: `src/app/client/(portal)/messages/[threadId]/page.tsx`
- Create: `src/app/client/(portal)/messages/[threadId]/_components/ClientThreadView.tsx`

**Step 1: Upgrade messages page**

Split into two sections:
1. Conversations (threads with stylist) — click to open thread
2. Notifications (existing feed, filtered to non-message types)

**Step 2: Create client thread view**

Client-facing chat view:
- Messages in conversation order
- Reply input at bottom
- Marks thread as read for client
- Sends replies via POST /api/client/messages/reply

**Step 3: Commit**

```bash
git add src/app/client/(portal)/messages/
git commit -m "feat: upgrade client messages with two-way threading"
```

---

## Task 18: Client Portal — Content Feed & Pages

**Files:**
- Modify: `src/app/client/(portal)/page.tsx` (add content feed section)
- Modify: `src/app/client/(portal)/_components/HomeDashboard.tsx`
- Create: `src/app/client/(portal)/content/page.tsx`
- Create: `src/app/client/(portal)/content/_components/ContentFeed.tsx`
- Create: `src/app/client/(portal)/content/[id]/page.tsx`
- Modify: `src/app/client/(portal)/_components/ClientPortalShell.tsx` (add Content to More menu)

**Step 1: Add content feed to home page**

Section at bottom of home dashboard: "From Your Stylist" — shows latest 3 published content posts. "See all" link to `/client/content`.

**Step 2: Create content browse page**

Full list of published content, styled as cards with category badge, title, date, body preview.

**Step 3: Create content detail page**

Full post view with title, date, category, body.

**Step 4: Add to More menu**

In `ClientPortalShell.tsx`, add to `moreItems`:
```typescript
{ label: "From Your Stylist", href: "/client/content", icon: "pen" },
```

**Step 5: Commit**

```bash
git add src/app/client/(portal)/
git commit -m "feat: add content feed to client portal"
```

---

## Task 19: Client Portal — Communication Preferences

**Files:**
- Modify: `src/app/client/(portal)/profile/page.tsx`
- Modify: `src/app/client/(portal)/profile/_components/ProfileForm.tsx`

**Step 1: Add comms preferences section to profile page**

Below existing profile info, add:
- Email notifications toggle
- SMS notifications toggle
- Quiet hours start/end time pickers
- Save button → PUT /api/client/preferences

**Step 2: Commit**

```bash
git add src/app/client/(portal)/profile/
git commit -m "feat: add comms preferences to client profile"
```

---

## Task 20: Integration Test & Build Verification

**Step 1: Run build**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github
export PATH="$HOME/.nvm/versions/node/v24.12.0/bin:$PATH"
npm run build
```

Fix any TypeScript errors.

**Step 2: Test kernel comms routes**

```bash
ssh metis-vps
curl -s -X POST https://opelle.dominusfoundry.com/api/v1/comms/dispatch \
  -H "Content-Type: application/json" \
  -H "X-Kernel-Auth: $KERNEL_KEY" \
  -d '{"event":"message.sent","workspace_id":"test","client_id":"test","context":{"title":"Test"},"body":"Hello test"}' | jq
```

**Step 3: Verify all pages load**

Manual smoke test:
- `/app/messages` — inbox loads
- `/app/content` — content list loads
- `/app/settings/templates` — templates load
- `/client/messages` — upgraded messages load
- `/client/content` — content feed loads
- `/client/profile` — comms prefs section visible

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve build errors from Phase 4 integration"
```

---

## Task Order & Dependencies

```
Task 1 (DB migration) — no deps, do first
Task 2 (Types) — needs Task 1 schema knowledge
Task 3 (Messaging DB) — needs Task 2 types
Task 4 (Content/Templates/Prefs DB) — needs Task 2 types
Task 5 (Kernel integration) — needs Task 2 types
Task 6 (VPS kernel routes) — needs Task 1 tables, independent of app code
  ↕ Tasks 3-6 can run in parallel
Task 7 (API routes — messaging) — needs Tasks 3, 5
Task 8 (API routes — content/templates) — needs Tasks 4, 5
Task 9 (Event emitters) — needs Task 5
Task 10 (Cron) — needs Tasks 5, 9
  ↕ Tasks 7-10 can run in parallel
Task 11 (Stylist inbox) — needs Task 7
Task 12 (Thread view) — needs Task 7, 11
Task 13 (Content editor) — needs Task 8
Task 14 (Templates manager) — needs Task 8
Task 15 (Client comms prefs — stylist) — needs Task 4
Task 16 (Client messages tab) — needs Task 12
  ↕ Tasks 11-16 can run in parallel (UI layer)
Task 17 (Client messages upgrade) — needs Task 7
Task 18 (Client content feed) — needs Task 8
Task 19 (Client comms prefs) — needs Task 4
  ↕ Tasks 17-19 can run in parallel (client UI layer)
Task 20 (Integration test) — needs all above
```

## Parallelization Groups

**Group A (Foundation):** Tasks 1, 2 — sequential
**Group B (Data + Kernel):** Tasks 3, 4, 5, 6 — parallel
**Group C (API Routes):** Tasks 7, 8, 9, 10 — parallel after Group B
**Group D (Stylist UI):** Tasks 11, 12, 13, 14, 15, 16 — parallel after Group C
**Group E (Client UI):** Tasks 17, 18, 19 — parallel after Group C
**Group F (Verification):** Task 20 — after all
