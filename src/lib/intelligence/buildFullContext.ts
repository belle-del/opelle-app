import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActiveLessonsForContext } from "@/lib/db/metis-feedback";
import type { MetisEntityType } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────

export interface ContextParams {
  workspaceId: string;
  userId: string;
  /** Explicit client ID from the page/component context */
  clientId?: string;
  /** Raw user message — used for name-matching fallback */
  message?: string;
  pageContext?: {
    page: string;
    entityType?: string;
    entityId?: string;
  };
}

// ── Client match result (for disambiguation) ────────────────

export interface ClientCandidate {
  id: string;
  name: string;
  lastVisit?: string;
  detail?: string; // distinguishing info: tag, service, etc.
}

export type ClientMatchResult =
  | { type: "exact"; clientId: string }
  | { type: "multiple"; candidates: ClientCandidate[] }
  | { type: "none" };

export interface FullContext {
  workspace: {
    id: string;
    name: string;
    type: string;
    settings: Record<string, unknown>;
  };

  client?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    hairProfile: Record<string, unknown>;
    preferences: string[];
    tags: string[];
    notes?: string;
    visitCount: number;
    lastVisit?: string;
  };

  recentFormulas?: {
    date: string;
    rawNotes: string;
    generalNotes?: string;
    parsedFormula?: Record<string, unknown>;
  }[];

  inspoPhotos?: {
    id: string;
    clientNotes?: string;
    aiAnalysis?: Record<string, unknown>;
    feasibility?: string;
    category?: string;
    createdAt: string;
  }[];

  products: {
    id: string;
    name: string;
    brand: string;
    category: string;
    inStock: boolean;
  }[];

  lowStockProducts?: {
    name: string;
    brand: string;
    shade?: string;
    category: string;
    quantity: number;
    threshold: number;
  }[];

  recentAppointments: {
    id: string;
    clientName: string;
    serviceName: string;
    date: string;
    status: string;
  }[];

  upcomingAppointments: {
    id: string;
    clientName: string;
    serviceName: string;
    date: string;
    status: string;
  }[];

  pendingTasks: {
    title: string;
    status: string;
  }[];

  totalClients: number;
  totalProducts: number;

  lessons: string[];

  /** Result of smart client detection from the message */
  clientMatch: ClientMatchResult;

  pageContext: {
    page: string;
    entityType?: string;
    entityId?: string;
  };
}

// ── Builder ──────────────────────────────────────────────────

export async function buildFullContext(params: ContextParams): Promise<FullContext> {
  const admin = createSupabaseAdminClient();
  const { workspaceId, clientId, message, pageContext } = params;

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // ── Parallel fetch: workspace + global data ────────────────
  const [
    workspaceResult,
    clientCountResult,
    productCountResult,
    productsResult,
    recentApptsResult,
    upcomingApptsResult,
    pendingTasksResult,
    allClientsResult,
  ] = await Promise.all([
    admin.from("workspaces").select("id, name, type, settings").eq("id", workspaceId).single(),

    admin.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),

    admin.from("products").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),

    admin
      .from("products")
      .select("id, name, brand, shade, line, category, quantity, low_stock_threshold")
      .eq("workspace_id", workspaceId)
      .order("quantity", { ascending: true })
      .limit(50),

    admin
      .from("appointments")
      .select("id, start_at, service_name, status, clients(first_name, last_name)")
      .eq("workspace_id", workspaceId)
      .order("start_at", { ascending: false })
      .limit(10),

    admin
      .from("appointments")
      .select("id, start_at, service_name, status, clients(first_name, last_name)")
      .eq("workspace_id", workspaceId)
      .in("status", ["scheduled", "pending_confirmation"])
      .gte("start_at", now.toISOString())
      .lte("start_at", in48h.toISOString())
      .order("start_at", { ascending: true }),

    admin
      .from("tasks")
      .select("id, title, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["pending", "in_progress"])
      .limit(10),

    // Fetch all clients for smart name-matching
    admin
      .from("clients")
      .select("id, first_name, last_name, tags, notes")
      .eq("workspace_id", workspaceId),
  ]);

  const workspace = workspaceResult.data;

  // ── Smart client resolution: explicit > scored name-match ──
  let resolvedClientId = clientId || undefined;
  let clientMatch: ClientMatchResult = { type: "none" };

  // Common words to ignore when extracting candidate names from messages
  const STOP_WORDS = new Set([
    "i", "me", "my", "the", "a", "an", "is", "are", "was", "were", "do", "does",
    "did", "has", "have", "had", "will", "would", "could", "should", "can",
    "what", "who", "how", "when", "where", "why", "which", "that", "this",
    "for", "with", "about", "from", "into", "on", "at", "to", "of", "in",
    "and", "or", "but", "not", "no", "yes", "please", "thanks", "thank",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "today", "tomorrow", "yesterday", "week", "month", "year",
    "metis", "formula", "color", "hair", "client", "product", "appointment",
    "service", "book", "rebook", "schedule", "suggest", "help", "show", "tell",
    "balayage", "highlights", "toner", "gloss", "bleach", "developer",
  ]);

  if (!resolvedClientId && message) {
    const clients = allClientsResult.data || [];

    // Score each client against the message
    const scored: { client: Record<string, unknown>; score: number }[] = [];

    for (const c of clients as Record<string, unknown>[]) {
      const first = ((c.first_name as string) || "").trim();
      const last = ((c.last_name as string) || "").trim();
      const full = `${first} ${last}`.trim();
      const msgLower = message.toLowerCase();

      let score = 0;

      // Exact full name match (case-insensitive)
      if (full.length > 2 && msgLower.includes(full.toLowerCase())) {
        score = 100;
      }
      // First name + last initial (e.g. "Sarah J")
      else if (first.length > 2 && last.length > 0) {
        const firstLastInitial = `${first} ${last[0]}`.toLowerCase();
        if (msgLower.includes(firstLastInitial)) {
          score = 80;
        }
      }

      // First name only (must not be a stop word, must be 3+ chars)
      if (score === 0 && first.length >= 3 && !STOP_WORDS.has(first.toLowerCase())) {
        // Check if the first name appears as a word boundary in the message
        const nameRegex = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i");
        if (nameRegex.test(message)) {
          score = 60;
        }
      }

      // Last name only (must be 3+ chars and not a stop word)
      if (score === 0 && last.length >= 3 && !STOP_WORDS.has(last.toLowerCase())) {
        const nameRegex = new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i");
        if (nameRegex.test(message)) {
          score = 50;
        }
      }

      if (score > 0) {
        scored.push({ client: c, score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 1 && scored[0].score >= 50) {
      // Single confident match
      resolvedClientId = scored[0].client.id as string;
      clientMatch = { type: "exact", clientId: resolvedClientId };
    } else if (scored.length > 1) {
      // Check if top scorer is clearly the best (full name match vs partial)
      const top = scored[0];
      const runnerUp = scored[1];
      if (top.score >= 80 && top.score > runnerUp.score) {
        // Unambiguous — full name or first+initial beats partials
        resolvedClientId = top.client.id as string;
        clientMatch = { type: "exact", clientId: resolvedClientId };
      } else {
        // Ambiguous — return candidates for disambiguation
        // Fetch last appointment for each candidate to show lastVisit
        const topCandidates = scored.slice(0, 5);
        const lastVisitResults = await Promise.all(
          topCandidates.map((s) =>
            admin.from("appointments")
              .select("start_at")
              .eq("client_id", s.client.id as string)
              .order("start_at", { ascending: false })
              .limit(1)
          )
        );
        const candidates: ClientCandidate[] = topCandidates.map((s, i) => {
          const c = s.client;
          const first = (c.first_name as string) || "";
          const last = (c.last_name as string) || "";
          const tags = Array.isArray(c.tags) ? (c.tags as string[]) : [];
          const lastAppt = lastVisitResults[i].data?.[0] as Record<string, unknown> | undefined;
          return {
            id: c.id as string,
            name: `${first} ${last}`.trim(),
            lastVisit: lastAppt?.start_at as string | undefined,
            detail: tags[0] || undefined,
          };
        });
        clientMatch = { type: "multiple", candidates };
      }
    }
  } else if (resolvedClientId) {
    clientMatch = { type: "exact", clientId: resolvedClientId };
  }

  // ── Client-specific data (if we have a client) ─────────────
  let clientContext: FullContext["client"] | undefined;
  let recentFormulas: FullContext["recentFormulas"] | undefined;
  let inspoPhotos: FullContext["inspoPhotos"] | undefined;

  if (resolvedClientId) {
    const [clientResult, formulasResult, inspoResult, clientApptsResult] = await Promise.all([
      admin.from("clients").select("*").eq("id", resolvedClientId).single(),

      admin
        .from("formula_entries")
        .select("id, service_date, raw_notes, general_notes, parsed_formula, service_type_id")
        .eq("client_id", resolvedClientId)
        .order("service_date", { ascending: false })
        .limit(5),

      admin
        .from("inspo_submissions")
        .select("id, client_notes, ai_analysis, feasibility, category, created_at")
        .eq("client_id", resolvedClientId)
        .order("created_at", { ascending: false })
        .limit(10),

      admin
        .from("appointments")
        .select("id, start_at, status, service_name")
        .eq("client_id", resolvedClientId)
        .order("start_at", { ascending: false })
        .limit(10),
    ]);

    const cd = clientResult.data as Record<string, unknown> | null;
    if (cd) {
      const prefProfile = (cd.preference_profile as Record<string, unknown>) || {};

      clientContext = {
        id: cd.id as string,
        name: `${cd.first_name || ""} ${cd.last_name || ""}`.trim(),
        email: cd.email as string | undefined,
        phone: cd.phone as string | undefined,
        hairProfile: {
          naturalColor: prefProfile.colorDirection,
          processingPreferences: prefProfile.processingPreferences,
          maintenanceLevel: prefProfile.maintenanceLevel,
          allergies: prefProfile.allergies,
          lifestyleNotes: prefProfile.lifestyleNotes,
        },
        preferences: Array.isArray(cd.tags) ? (cd.tags as string[]) : [],
        tags: Array.isArray(cd.tags) ? (cd.tags as string[]) : [],
        notes: cd.notes as string | undefined,
        visitCount: (prefProfile.totalVisits as number) || 0,
        lastVisit: (clientApptsResult.data?.[0] as Record<string, unknown>)?.start_at as string | undefined,
      };

      recentFormulas = (formulasResult.data || []).map((f: Record<string, unknown>) => ({
        date: f.service_date as string,
        rawNotes: f.raw_notes as string,
        generalNotes: f.general_notes as string | undefined,
        parsedFormula: f.parsed_formula as Record<string, unknown> | undefined,
      }));

      inspoPhotos = (inspoResult.data || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        clientNotes: p.client_notes as string | undefined,
        aiAnalysis: p.ai_analysis as Record<string, unknown> | undefined,
        feasibility: p.feasibility as string | undefined,
        category: p.category as string | undefined,
        createdAt: p.created_at as string,
      }));
    }
  }

  // ── Products ───────────────────────────────────────────────
  const allProducts = productsResult.data || [];
  const products = allProducts.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: (p.name as string) || `${p.brand} ${p.shade || p.line || ""}`.trim(),
    brand: p.brand as string,
    category: p.category as string,
    inStock: ((p.quantity as number) || 0) > 0,
  }));

  const lowStockProducts = allProducts
    .filter((p: Record<string, unknown>) => (p.quantity as number) <= ((p.low_stock_threshold as number) || 3))
    .map((p: Record<string, unknown>) => ({
      name: (p.name as string) || `${p.brand} ${p.shade || p.line || ""}`.trim(),
      brand: p.brand as string,
      shade: p.shade as string | undefined,
      category: p.category as string,
      quantity: p.quantity as number,
      threshold: (p.low_stock_threshold as number) || 3,
    }));

  // ── Appointments (properly serialized) ─────────────────────
  const serializeAppts = (data: Record<string, unknown>[] | null) =>
    (data || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      clientName: `${(a.clients as Record<string, unknown>)?.first_name || ""} ${(a.clients as Record<string, unknown>)?.last_name || ""}`.trim() || "Unknown",
      serviceName: (a.service_name as string) || "Unknown",
      date: a.start_at as string,
      status: a.status as string,
    }));

  const recentAppointments = serializeAppts(recentApptsResult.data as Record<string, unknown>[] | null);
  const upcomingAppointments = serializeAppts(upcomingApptsResult.data as Record<string, unknown>[] | null);

  // ── Tasks ──────────────────────────────────────────────────
  const pendingTasks = (pendingTasksResult.data || []).map((t: Record<string, unknown>) => ({
    title: t.title as string,
    status: t.status as string,
  }));

  // ── Lessons ────────────────────────────────────────────────
  const entityType: MetisEntityType | undefined = clientContext ? "client" : undefined;
  const entityId = resolvedClientId;
  const lessons = await getActiveLessonsForContext(entityType, entityId);

  return {
    workspace: {
      id: workspace?.id || workspaceId,
      name: (workspace?.name as string) || "Unknown",
      type: (workspace?.type as string) || "individual",
      settings: (workspace?.settings as Record<string, unknown>) || {},
    },
    client: clientContext,
    recentFormulas,
    inspoPhotos,
    totalClients: clientCountResult.count ?? 0,
    totalProducts: productCountResult.count ?? 0,
    products: products.slice(0, 20),
    lowStockProducts: lowStockProducts.length > 0 ? lowStockProducts : undefined,
    recentAppointments,
    upcomingAppointments,
    pendingTasks,
    lessons,
    clientMatch,
    pageContext: pageContext || { page: "metis_chat" },
  };
}
