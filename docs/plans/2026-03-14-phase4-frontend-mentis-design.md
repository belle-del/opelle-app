# Phase 4 Frontend Polish + Mentis AI Copilot — Design

**Goal:** Polish all Phase 4 communication & content pages to production quality, add missing interactive features (nav badges, auto-refresh), and introduce Mentis — a dedicated AI copilot for stylists that lives both as a full chat page and a floating mini-chat accessible from anywhere.

**Architecture:** Next.js App Router pages + client components. All AI traffic routes through MetisOS kernel (`POST /api/v1/ai/chat`). Mentis is contextually aware — it knows what page the stylist is on and can receive client/product/formula context. Cosmetology knowledge will be fed into the kernel over time.

**Tech Stack:** Next.js 16, Tailwind CSS 4, Supabase, MetisOS kernel (Fastify on VPS)

---

## Section 1: Polish Existing Phase 4 Pages

### Stylist Messages Inbox (`/app/messages`)
- Thread list with client avatar circles (initials), unread count as brass badge
- Last message preview (truncated), relative timestamp
- Compose button → dialog with client picker + template selector
- Empty state with icon + "Start a conversation" CTA

### Stylist Message Thread (`/app/messages/[threadId]`)
- Chat-style bubbles: stylist messages right-aligned (garnet tint), client messages left-aligned (stone)
- Message input bar pinned to bottom with send button
- Thread subject + client name in header
- Auto-scroll to newest message

### Stylist Content Manager (`/app/content`)
- Card grid of posts with category pills (Tip, Product Spotlight, Seasonal)
- Draft/Published status badges
- Click to edit, publish button on drafts
- Empty state: "Share tips and updates with your clients"

### Stylist Content Editor (`/app/content/new`, `/app/content/[id]/edit`)
- Title input, body textarea, category picker dropdown
- Preview toggle to see rendered post
- Save as Draft / Publish buttons

### Stylist Templates (`/app/settings/templates`)
- Grouped by category (Rebook, Thank You, Welcome, Follow Up, Custom)
- System templates marked with badge, not deletable
- Variable reference: {{clientName}}, {{stylistName}}, {{appointmentDate}}
- Inline edit with live preview

### Client Detail — Comms Prefs (`/app/clients/[id]`)
- CommsPrefsSection card: rebook reminder weeks, email/SMS toggles, quiet hours
- ClientMessagesTab: recent messages with link to full thread

### Client Portal Messages (`/client/messages`)
- Conversations section: thread list with stylist name, last message preview
- Notifications section: type-specific icons, unread styling (brass border)
- Mark All Read button

### Client Portal Content (`/client/content`)
- Published posts feed with category badges and dates
- Click through to full post detail
- Empty state: "Your stylist hasn't shared any posts yet"

### Client Comms Preferences (`/client/profile`)
- Email/SMS toggles, quiet hours time inputs
- Rebook reminder frequency
- Save with loading state

## Section 2: Missing Interactive Features

### Nav Badges
- Unread message count badge on Messages nav item (brass circle, white text)
- Fetched on layout mount, refreshed periodically

### Auto-refresh
- Message thread polls for new messages (or uses Supabase realtime subscription)
- Thread list refreshes unread counts

### Dashboard Integration
- "From Your Stylist" section on client home dashboard with latest 3 content posts
- Link to full content feed

## Section 3: Mentis AI Copilot

### Identity
- Name: "Mentis"
- Visual: Subtle brass glow accent, signature icon (brain/spark motif)
- Personality: Knowledgeable, concise, salon-savvy
- Distinction: Mostly matches Opelle palette but brass glow border/accent marks AI surfaces

### Dedicated Chat Page (`/app/mentis`)
- Full-page chat interface
- Top-level nav item with Mentis icon in Practice section
- Conversation history with markdown-rendered responses
- Message input with send button
- Suggested prompts for first-time users ("Who's due for a rebook?", "What products are running low?", "Suggest a formula for warm copper tones")
- Context chips showing what data Mentis has access to

### Floating Mini-Chat
- Small Mentis icon button, bottom-right corner of every stylist page
- Click expands a slide-up panel (~400px wide, ~500px tall)
- Same chat interface as full page but compact
- Knows current page context (sends page route + relevant IDs)
- Close button to dismiss, badge if Mentis has a pending suggestion
- Does NOT appear on client portal (stylist only)

### Contextual Suggestions (Proactive Cards)
- **Client Detail Page:** "This client is 2 weeks overdue for a rebook" or "Based on their formula history, they may be interested in a gloss treatment"
- **Product Detail Page:** "This product is predicted to run out in 12 days" (ties into Phase E inventory predictions)
- **Dashboard:** "You have 3 clients overdue for rebooks this week"
- Cards have brass left-border, Mentis icon, dismiss button
- Quiet indicator: small Mentis icon on page header that glows when nice-to-have suggestions available, click to reveal

### Kernel Integration
- New API route: `POST /api/intelligence/chat`
- Gathers context (current page, client ID, product ID, recent formulas) and sends to kernel
- New kernel route: `POST /api/v1/ai/chat`
  - Model: sonnet (conversational, needs quality)
  - System prompt: salon AI copilot with cosmetology knowledge, access to client/formula/product/appointment data
  - Supports conversation history (multi-turn)
  - Returns markdown-formatted responses
- Contextual suggestions: `POST /api/intelligence/suggestions`
  - Kernel route: `POST /api/v1/ai/suggestions`
  - Model: haiku (fast, lightweight)
  - Input: page context + relevant entity data
  - Returns: array of suggestion cards with priority (proactive vs quiet)

---

## Design Principles
- Mentis is a tool, not a gimmick — suggestions should be genuinely useful
- Proactive cards only for actionable insights, not noise
- Floating chat should feel lightweight, not intrusive
- All existing pages get polish pass but no structural changes
- Brass glow is the signature Mentis visual — used sparingly
