# Phase 4 — Content & Communication (Event-Driven)

**Date:** 2026-03-14
**Status:** Approved

## Architecture

Event-driven, kernel-native. The app emits events; the MetisOS kernel processes, personalizes via AI, and dispatches to delivery channels. The app never calls Resend or Telnyx directly.

```
APP EVENT (stylist action / auto-trigger / cron)
        |
  POST /api/v1/events/ingest (kernel)
        |
  Kernel Event Processor
    -> matches event type to communication rules
    -> AI personalizes message content (cortex + client profile)
    -> determines delivery channels per client prefs
        |
  Dispatch Pipeline (kernel)
    |-> in-app notification (writes to Supabase)
    |-> email (Resend via kernel)
    |-> SMS (Telnyx via kernel)
```

## New Kernel Routes

| Route | Purpose |
|-------|---------|
| `/api/v1/comms/dispatch` | Receive event, personalize, deliver |
| `/api/v1/comms/send-email` | Resend email dispatch |
| `/api/v1/comms/send-sms` | Telnyx SMS dispatch |
| `/api/v1/comms/personalize` | AI message personalization |
| `/api/v1/comms/templates` | CRUD for message templates |

## New Database Tables

### messages
Two-way conversation messages.
- id (UUID PK), workspace_id, thread_id (FK)
- sender_type ('stylist' | 'client'), sender_id
- body (TEXT), created_at

### message_threads
Conversation threads between stylist and client.
- id (UUID PK), workspace_id, client_id (FK)
- subject, last_message_at
- unread_stylist (INT), unread_client (INT)

### communication_preferences
Per-client delivery settings.
- id (UUID PK), client_id (FK), workspace_id
- email_enabled (BOOL), sms_enabled (BOOL)
- rebook_reminder_weeks (INT, configurable per client)
- quiet_hours_start (TIME), quiet_hours_end (TIME)

### message_templates
System-shipped + custom stylist templates.
- id (UUID PK), workspace_id
- name, category ('rebook' | 'thank_you' | 'welcome' | 'follow_up' | 'custom')
- body_template (TEXT, supports {{variables}})
- is_system (BOOL)

### content_posts
Stylist-published content for clients.
- id (UUID PK), workspace_id
- title, body, category ('tip' | 'product_spotlight' | 'seasonal')
- published_at (nullable = draft), created_at

### delivery_log
Audit trail for all dispatched messages.
- id (UUID PK), workspace_id, notification_id (FK)
- channel ('in_app' | 'email' | 'sms')
- status ('sent' | 'failed' | 'delivered')
- external_id, error, sent_at

## Auto-Trigger Events

| Event | Trigger | Message |
|-------|---------|---------|
| `aftercare.published` | Stylist publishes aftercare plan | "Your aftercare plan from [date] is ready" |
| `rebook.reminder` | Cron: X weeks since last appointment | AI-personalized rebook nudge |
| `order.status_changed` | Stylist updates product order | "Your [product] order has been [status]" |
| `inspo.reviewed` | Stylist reviews inspo submission | "Your stylist reviewed your inspiration photos" |
| `appointment.confirmed` | Appointment booked/confirmed | "Your appointment on [date] is confirmed" |
| `appointment.changed` | Appointment rescheduled/cancelled | "Your appointment has been [updated/cancelled]" |
| `content.published` | Stylist posts new content | "New from your stylist: [title]" |
| `message.sent` | Stylist sends direct message | The message itself |
| `client.welcome` | New client joins portal | AI-personalized welcome |

**Rebook cron:** Runs daily, checks each client's `rebook_reminder_weeks` vs last appointment. Emits `rebook.reminder` per client due. Kernel personalizes via cortex knowledge + client profile.

**Dispatch rules per event:**
- Always: in-app notification
- If enabled: email and/or SMS (respects client prefs + quiet hours)
- AI personalization: rebook reminders, welcome messages, any template with {{variables}}

## UI Surfaces

### Practitioner Console (stylist)

| Surface | Route | Purpose |
|---------|-------|---------|
| Messages Inbox | `/app/messages` | All threads, sorted recent, unread badges |
| Thread View | `/app/messages/[threadId]` | Conversation with client, send reply |
| Compose | Button in inbox + client detail | Pick client, pick template or freeform, preview, send |
| Client Messages Tab | `/app/clients/[id]` (tab) | Thread history inline on client profile |
| Content List | `/app/content` | All published + draft content |
| Content Editor | `/app/content/new`, `/app/content/[id]/edit` | Write/edit/publish content |
| Templates Manager | `/app/settings/templates` | View system templates, create/edit custom |
| Client Comms Prefs | Client edit page | Rebook reminder weeks, email/SMS opt-in status |

### Client Portal

| Surface | Route | Purpose |
|---------|-------|---------|
| Messages (upgraded) | `/client/messages` | Unified feed: notifications + threads |
| Thread View | `/client/messages/[threadId]` | Reply to stylist |
| Content Feed | Home page section | Latest content from stylist |
| Content Browse | `/client/content` | All past content |
| Content Detail | `/client/content/[id]` | Full post view |
| Comms Preferences | `/client/profile` | Toggle email/SMS, set quiet hours |

## End-to-End Flows

### Stylist sends message
```
App: POST /api/messages/send { clientId, body?, templateId? }
  -> App calls kernel: POST /api/v1/comms/dispatch
    -> If template: kernel fills variables via AI
    -> Kernel writes notification to Supabase (in-app)
    -> Kernel checks client prefs
    -> If email_enabled: Resend via /comms/send-email
    -> If sms_enabled: Telnyx via /comms/send-sms
    -> Kernel logs deliveries to delivery_log
  -> App creates message record in messages table
```

### Auto-trigger (rebook reminder)
```
Vercel cron: GET /api/cron/rebook-reminders
  -> Query clients due for rebook
  -> For each: POST /api/v1/comms/dispatch
    { event: "rebook.reminder", clientId, context: { lastAppointment, clientName } }
    -> Kernel personalizes via cortex + client profile
    -> Dispatches to all enabled channels
```

### Client replies
```
Client: POST /api/client/messages/reply { threadId, body }
  -> App creates message record (sender_type: 'client')
  -> App emits: POST /api/v1/events/ingest
    { type: "client.message_received", clientId, threadId }
  -> Kernel creates notification for stylist
```

## Environment Variables (VPS kernel)

- `RESEND_API_KEY` — from Resend account
- `TELNYX_API_KEY` — from Telnyx account
- `RESEND_FROM_EMAIL` — verified sender domain

## Kernel Packages (VPS)

- `resend` (npm)
- `telnyx` (npm)
