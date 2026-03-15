# Phase 4 Frontend Polish + Mentis AI Copilot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish all Phase 4 communication/content pages, add nav badges + auto-refresh, and build Mentis AI copilot with dedicated chat, floating mini-chat, and contextual suggestion cards.

**Architecture:** Existing Phase 4 pages are functionally complete — tasks focus on visual polish, interactive enhancements, and the new Mentis system. Mentis chat routes through MetisOS kernel via `POST /api/v1/ai/chat`. Contextual suggestions use `POST /api/v1/ai/suggestions`. All AI traffic follows Immutable Rule 2 (through kernel only).

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 4 + CSS custom properties, Supabase, MetisOS kernel (Fastify, VPS port 3203)

---

## Dependency Graph

```
Task 1 (types) ──┬──→ Task 2 (kernel chat fn)
                  │        │
                  │        ├──→ Task 5 (chat API route)
                  │        │        │
                  │        │        ├──→ Task 7 (Mentis chat page)
                  │        │        │        │
                  │        │        │        └──→ Task 8 (floating mini-chat)
                  │        │        │
                  │        └──→ Task 6 (suggestions API route)
                  │                 │
                  │                 └──→ Task 9 (contextual cards)
                  │
                  └──→ Task 3 (VPS chat route)
                  └──→ Task 4 (VPS suggestions route)

Task 10 (nav badges) — independent
Task 11 (message auto-refresh) — independent
Task 12 (visual polish pass) — independent, do last
```

**Parallelization Groups:**
- **Group A** (independent): Tasks 1
- **Group B** (after 1): Tasks 2, 3, 4, 10, 11
- **Group C** (after 2-4): Tasks 5, 6
- **Group D** (after 5-6): Tasks 7, 8, 9
- **Group E** (last): Task 12

---

### Task 1: Add Mentis Types

**Files:**
- Modify: `src/lib/types.ts`

Add these types at the end of the file, before any closing exports:

```typescript
// ============================================================
// Mentis AI Copilot
// ============================================================

export type MentisMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context?: MentisContext;
};

export type MentisContext = {
  page?: string;
  clientId?: string;
  clientName?: string;
  productId?: string;
  productName?: string;
  formulaId?: string;
};

export type MentisChatRequest = {
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  context?: MentisContext;
};

export type MentisChatResponse = {
  reply: string;
  suggestedFollowUps?: string[];
};

export type MentisSuggestion = {
  id: string;
  priority: "proactive" | "quiet";
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
};

export type MentisSuggestionsResult = {
  suggestions: MentisSuggestion[];
};
```

**Commit:** `feat: add Mentis AI copilot types`

---

### Task 2: Add Kernel Chat & Suggestions Functions

**Files:**
- Modify: `src/lib/kernel.ts`

Add import for new types at the top:

```typescript
import type { ..., MentisChatResponse, MentisSuggestionsResult } from "@/lib/types";
```

Add these functions at the end of the file:

```typescript
// --- MENTIS AI COPILOT ---

export async function mentisChat(params: {
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  context?: {
    page?: string;
    clientId?: string;
    clientName?: string;
    productId?: string;
    productName?: string;
    formulaId?: string;
  };
  workspaceContext?: {
    totalClients?: number;
    totalProducts?: number;
    recentAppointments?: { serviceName: string; clientName: string; date: string }[];
  };
}): Promise<MentisChatResponse | null> {
  const result = await kernelPost("/api/v1/ai/chat", {
    message: params.message,
    conversation_history: params.conversationHistory,
    context: params.context,
    workspace_context: params.workspaceContext,
  }, 30000); // longer timeout for conversational AI
  return result ?? null;
}

export async function mentisSuggestions(params: {
  page: string;
  entityType?: "client" | "product" | "formula" | "dashboard";
  entityData?: Record<string, unknown>;
}): Promise<MentisSuggestionsResult | null> {
  const result = await kernelPost("/api/v1/ai/suggestions", {
    page: params.page,
    entity_type: params.entityType,
    entity_data: params.entityData,
  }, 10000);
  return result ?? null;
}
```

**Commit:** `feat: add Mentis kernel functions for chat and suggestions`

---

### Task 3: Add VPS Chat Route

**Files:**
- Modify (VPS): `/root/MetisOS-opelle/src/api/routes/saas.js`

SSH into VPS and add this route. Follow the existing pattern in saas.js (Fastify, ESM, `syscallFromRequest`).

```javascript
// --- MENTIS AI CHAT ---
fastify.post("/ai/chat", async (request, reply) => {
  const { message, conversation_history = [], context = {}, workspace_context = {} } = request.body || {};

  if (!message) {
    return reply.code(400).send({ error: "message is required" });
  }

  const messages = [];

  // Build conversation history
  for (const msg of conversation_history.slice(-20)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: message });

  // Build context string
  const contextParts = [];
  if (context.page) contextParts.push(`User is currently on: ${context.page}`);
  if (context.clientName) contextParts.push(`Viewing client: ${context.clientName} (ID: ${context.clientId})`);
  if (context.productName) contextParts.push(`Viewing product: ${context.productName} (ID: ${context.productId})`);
  if (workspace_context.totalClients) contextParts.push(`Workspace has ${workspace_context.totalClients} clients`);
  if (workspace_context.totalProducts) contextParts.push(`Workspace has ${workspace_context.totalProducts} products`);
  if (workspace_context.recentAppointments?.length) {
    const recent = workspace_context.recentAppointments.slice(0, 5)
      .map(a => `${a.clientName}: ${a.serviceName} on ${a.date}`).join("; ");
    contextParts.push(`Recent appointments: ${recent}`);
  }

  const contextStr = contextParts.length > 0 ? `\n\nCurrent context:\n${contextParts.join("\n")}` : "";

  try {
    const aiResult = await callAI({
      model: "sonnet",
      system: `You are Mentis, an expert AI copilot for hair salon professionals using the Opelle salon management platform. You have deep knowledge of:

- Cosmetology: hair color theory, formulation, techniques (balayage, foiling, toning), product chemistry
- Salon business: client retention, rebooking strategies, inventory management, pricing
- The stylist's data: clients, formulas, products, appointments, and business metrics

Be concise, knowledgeable, and actionable. Use salon-industry terminology naturally. When referencing specific clients or products, use their names. Format responses in markdown when helpful (bold, lists, headers).

Do NOT make up data you don't have. If asked about specific numbers or records you weren't given context for, say you'd need that data and suggest where to find it in the app.${contextStr}`,
      messages,
      max_tokens: 1500,
    });

    const responseText = aiResult?.content?.[0]?.text || "I'm sorry, I couldn't process that request.";

    // Generate follow-up suggestions
    const followUps = [];
    if (context.clientName) {
      followUps.push(`What formula would you suggest for ${context.clientName}?`);
      followUps.push(`When should ${context.clientName} rebook?`);
    }
    if (context.productName) {
      followUps.push(`What are alternatives to this product?`);
    }

    return { reply: responseText, suggestedFollowUps: followUps.length > 0 ? followUps : undefined };
  } catch (err) {
    fastify.log.error(err, "Mentis chat error");
    return reply.code(500).send({ error: "AI processing failed" });
  }
});
```

**Test:** `curl -X POST https://opelle.dominusfoundry.com/api/v1/ai/chat -H "Content-Type: application/json" -H "X-Kernel-Auth: $KEY" -d '{"message":"What is balayage?"}'`

**Commit (VPS):** Restart with `pm2 restart MetisOS-opelle`

---

### Task 4: Add VPS Suggestions Route

**Files:**
- Modify (VPS): `/root/MetisOS-opelle/src/api/routes/saas.js`

```javascript
// --- MENTIS CONTEXTUAL SUGGESTIONS ---
fastify.post("/ai/suggestions", async (request, reply) => {
  const { page, entity_type, entity_data = {} } = request.body || {};

  if (!page) {
    return reply.code(400).send({ error: "page is required" });
  }

  // Build context for suggestion generation
  const dataStr = Object.entries(entity_data)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join("\n");

  try {
    const aiResult = await callAI({
      model: "haiku",
      system: `You are Mentis, an AI copilot for salon professionals. Generate 0-3 brief, actionable suggestions based on the data provided. Only suggest things that are genuinely useful — no filler.

Return a JSON array of suggestion objects:
[{"priority":"proactive"|"quiet", "title":"Short title", "body":"1-2 sentence insight", "actionLabel":"optional CTA", "actionUrl":"optional /app/path"}]

Priority guide:
- "proactive": Important, time-sensitive (overdue rebooks, low stock, upcoming appointments needing prep)
- "quiet": Nice-to-have insights (trends, tips, optimization ideas)

Return an empty array [] if there's nothing useful to suggest. Do NOT make up data.`,
      messages: [{
        role: "user",
        content: `Page: ${page}\nEntity type: ${entity_type || "none"}\nData:\n${dataStr || "none"}`
      }],
      max_tokens: 500,
    });

    const responseText = aiResult?.content?.[0]?.text || "[]";
    let suggestions = [];
    try {
      const parsed = JSON.parse(responseText);
      suggestions = Array.isArray(parsed) ? parsed.map((s, i) => ({
        id: `suggestion-${Date.now()}-${i}`,
        priority: s.priority || "quiet",
        title: s.title || "",
        body: s.body || "",
        actionLabel: s.actionLabel || undefined,
        actionUrl: s.actionUrl || undefined,
      })) : [];
    } catch {
      suggestions = [];
    }

    return { suggestions };
  } catch (err) {
    fastify.log.error(err, "Mentis suggestions error");
    return reply.code(500).send({ error: "AI processing failed" });
  }
});
```

**Commit (VPS):** Restart with `pm2 restart MetisOS-opelle`

---

### Task 5: Create Chat API Route

**Files:**
- Create: `src/app/api/intelligence/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mentisChat } from "@/lib/kernel";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();
  const { message, conversationHistory = [], context = {} } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Gather workspace context for Mentis
  const [clientCount, productCount, recentAppts] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("appointments").select("id, start_at, services(name), clients(first_name, last_name)")
      .eq("workspace_id", workspace.id)
      .order("start_at", { ascending: false })
      .limit(10),
  ]);

  const workspaceContext = {
    totalClients: clientCount.count ?? 0,
    totalProducts: productCount.count ?? 0,
    recentAppointments: (recentAppts.data || []).map((a: Record<string, unknown>) => ({
      serviceName: (a.services as Record<string, unknown>)?.name as string || "Unknown",
      clientName: `${(a.clients as Record<string, unknown>)?.first_name || ""} ${(a.clients as Record<string, unknown>)?.last_name || ""}`.trim(),
      date: a.start_at as string,
    })),
  };

  const result = await mentisChat({
    message,
    conversationHistory,
    context,
    workspaceContext,
  });

  if (!result) {
    return NextResponse.json({ error: "Mentis unavailable" }, { status: 503 });
  }

  return NextResponse.json(result);
}
```

**Commit:** `feat: add Mentis chat API route`

---

### Task 6: Create Suggestions API Route

**Files:**
- Create: `src/app/api/intelligence/suggestions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mentisSuggestions } from "@/lib/kernel";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const { page, entityType, entityData } = await req.json();

  const result = await mentisSuggestions({ page, entityType, entityData });
  if (!result) {
    return NextResponse.json({ suggestions: [] });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
```

**Commit:** `feat: add Mentis suggestions API route`

---

### Task 7: Create Mentis Full Chat Page

**Files:**
- Create: `src/app/app/mentis/page.tsx`
- Create: `src/app/app/mentis/_components/MentisChat.tsx`

**`src/app/app/mentis/page.tsx`:**

```typescript
import MentisChat from "./_components/MentisChat";

export default function MentisPage() {
  return <MentisChat fullPage />;
}
```

**`src/app/app/mentis/_components/MentisChat.tsx`:**

Client component — full chat interface with:
- Conversation state managed via useState
- Messages rendered with basic markdown support (bold, lists, code blocks) using a safe rendering approach — convert markdown to React elements, do NOT use innerHTML with unsanitized content
- User messages right-aligned with stone background
- Mentis messages left-aligned with brass-glow left border
- Mentis avatar (sparkle/brain icon) next to assistant messages
- Input bar at bottom with send button
- Suggested follow-up chips after Mentis responses
- Starter prompts when conversation is empty:
  - "Who's due for a rebook this week?"
  - "What products are running low?"
  - "Suggest a formula for warm copper tones"
  - "How do I price a balayage service?"
- Loading state: pulsing Mentis icon while waiting for response
- POSTs to `/api/intelligence/chat`
- Props: `fullPage?: boolean` (controls sizing — full viewport vs panel), `context?: MentisContext`
- Brass glow accent: `box-shadow: 0 0 20px rgba(196, 171, 112, 0.15)` on the chat container

This is the largest component (~300-400 lines). Include:
- `formatTime()` helper for message timestamps
- Auto-scroll to bottom on new messages
- Enter to send, Shift+Enter for new line
- Error handling with retry option

**Commit:** `feat: add Mentis full chat page`

---

### Task 8: Create Floating Mini-Chat

**Files:**
- Create: `src/app/app/_components/MentisFloatingChat.tsx`
- Modify: `src/app/app/layout.tsx`

**`src/app/app/_components/MentisFloatingChat.tsx`:**

Client component:
- Fixed-position button, bottom-right (bottom: 24px, right: 24px)
- Button: 56px circle, brass gradient background, sparkle icon, subtle glow on hover
- Click toggles a slide-up panel (400px wide x 500px tall on desktop, full-width on mobile)
- Panel renders `<MentisChat fullPage={false} context={currentContext} />` (reuse the same chat component)
- Panel has header bar: "Mentis" title + close (X) button
- Smooth transition (transform + opacity)
- Uses `usePathname()` to pass current page as context
- Z-index above everything else (z-50)
- Does NOT render on `/app/mentis` (full page already open)

**Modify `src/app/app/layout.tsx`:**

Add `<MentisFloatingChat />` after the main content div (inside the layout, after `{children}`).

```typescript
import MentisFloatingChat from "./_components/MentisFloatingChat";

// ... in the return, after {children}:
<MentisFloatingChat />
```

**Commit:** `feat: add Mentis floating mini-chat on all stylist pages`

---

### Task 9: Create Contextual Suggestion Cards

**Files:**
- Create: `src/app/app/_components/MentisSuggestionCard.tsx`
- Create: `src/app/app/_components/MentisSuggestions.tsx`

**`src/app/app/_components/MentisSuggestionCard.tsx`:**

Single suggestion card component:
- Brass left border (3px solid var(--brass))
- Small Mentis sparkle icon top-left
- Title (bold, 13px) + body (12px, dim)
- Optional action button (link style)
- Dismiss (X) button top-right
- Proactive cards: visible by default
- Quiet cards: hidden, revealed by clicking the Mentis indicator

**`src/app/app/_components/MentisSuggestions.tsx`:**

Container component:
- Accepts `page`, `entityType`, `entityData` props
- Fetches suggestions from `/api/intelligence/suggestions` on mount
- Renders proactive cards immediately
- Shows quiet indicator (small glowing Mentis icon) if quiet suggestions exist
- Click quiet indicator to expand quiet cards
- Dismissed suggestions stored in sessionStorage so they don't reappear on same session
- Returns null if no suggestions (graceful degradation)

**Integration points (modify these files to add `<MentisSuggestions />`):**
- `src/app/app/clients/[id]/page.tsx` — after client header, pass client data
- `src/app/app/products/[id]/page.tsx` — after product header, pass product data
- `src/app/app/page.tsx` (dashboard) — in dashboard area, pass `page="dashboard"`

**Commit:** `feat: add Mentis contextual suggestion cards`

---

### Task 10: Add Nav Badges for Unread Messages

**Files:**
- Modify: `src/app/app/_components/AppNav.tsx`

Add an unread message count badge to the Messages nav item:
- Create a client wrapper component or use a small `useEffect` to fetch unread count from `/api/messages/threads` (parse total unread from response)
- Render a small brass circle badge (16px, absolute positioned top-right of icon) with white text count
- Only show badge when count > 0
- Refresh count every 30 seconds via `setInterval`
- Badge style: `background: var(--brass)`, `color: white`, `font-size: 10px`, `min-width: 16px`, `height: 16px`, `border-radius: 50%`

**Commit:** `feat: add unread message badge to nav`

---

### Task 11: Add Auto-Refresh to Message Thread

**Files:**
- Modify: `src/app/app/messages/[threadId]/_components/ThreadView.tsx`

Add polling for new messages:
- `useEffect` with `setInterval` every 5 seconds
- Fetch messages from `/api/messages/threads/${threadId}`
- Only update state if message count changed (avoid unnecessary re-renders)
- Clear interval on unmount
- Pause polling when tab is not visible (`document.hidden`)

Also modify:
- `src/app/client/(portal)/messages/[threadId]/_components/ClientThreadView.tsx` — same polling pattern

**Commit:** `feat: add auto-refresh polling to message threads`

---

### Task 12: Visual Polish Pass

**Files:**
- Modify: `src/app/app/messages/page.tsx`
- Modify: `src/app/app/messages/_components/ThreadList.tsx`
- Modify: `src/app/app/content/page.tsx`
- Modify: `src/app/app/content/_components/ContentList.tsx`
- Modify: `src/app/client/(portal)/messages/page.tsx`
- Modify: `src/app/client/(portal)/content/_components/ContentFeed.tsx`
- Modify: `src/app/app/_components/AppNav.tsx` (add Mentis nav item)

Polish checklist:
1. **AppNav** — Add Mentis nav item to Practice section with sparkle icon, positioned after Content
2. **Messages Inbox** — Ensure thread cards have consistent avatar sizes, proper text truncation, timestamps right-aligned
3. **Content List** — Ensure card grid is responsive (1 col mobile, 2 col tablet, 3 col desktop)
4. **Client Messages** — Ensure notification cards have proper padding and brass unread styling
5. **Content Feed (client)** — Verify category badge colors match stylist side
6. **All pages** — Verify empty states have proper icons, helpful text, and CTA buttons
7. **All pages** — Verify loading states use consistent spinner pattern

Mentis nav item to add in AppNav:

```typescript
{ name: "Mentis", href: "/app/mentis", icon: Sparkles }
```

Add to the Practice section items array, after Content.

**Commit:** `feat: visual polish pass + add Mentis to nav`

---

## Files Modified Summary

| File | Change |
|------|--------|
| `src/lib/types.ts` | Mentis types |
| `src/lib/kernel.ts` | `mentisChat()` + `mentisSuggestions()` |
| `src/app/api/intelligence/chat/route.ts` | NEW — chat API |
| `src/app/api/intelligence/suggestions/route.ts` | NEW — suggestions API |
| `src/app/app/mentis/page.tsx` | NEW — full chat page |
| `src/app/app/mentis/_components/MentisChat.tsx` | NEW — chat component |
| `src/app/app/_components/MentisFloatingChat.tsx` | NEW — floating button + panel |
| `src/app/app/_components/MentisSuggestionCard.tsx` | NEW — suggestion card |
| `src/app/app/_components/MentisSuggestions.tsx` | NEW — suggestions container |
| `src/app/app/layout.tsx` | Add floating chat |
| `src/app/app/_components/AppNav.tsx` | Nav badge + Mentis item |
| `src/app/app/messages/[threadId]/_components/ThreadView.tsx` | Auto-refresh |
| `src/app/client/(portal)/messages/[threadId]/_components/ClientThreadView.tsx` | Auto-refresh |
| `src/app/app/clients/[id]/page.tsx` | Mentis suggestions |
| `src/app/app/products/[id]/page.tsx` | Mentis suggestions |
| `src/app/app/page.tsx` | Mentis suggestions |
| VPS `saas.js` | `POST /ai/chat` + `POST /ai/suggestions` |

## Verification

1. `npm run build` — TypeScript compiles clean
2. Open `/app/mentis` — Chat page renders with starter prompts
3. Send a message — Mentis responds with formatted markdown
4. Check floating chat button appears on other pages
5. Open floating chat, send message — works in panel
6. Check client detail page — suggestion cards appear (if kernel returns any)
7. Check Messages nav — unread badge shows count
8. Open a message thread — new messages appear without refresh
9. `pm2 restart MetisOS-opelle` on VPS after adding routes
