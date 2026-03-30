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

    // Fetch all clients for name-matching fallback
    admin
      .from("clients")
      .select("id, first_name, last_name")
      .eq("workspace_id", workspaceId),
  ]);

  const workspace = workspaceResult.data;

  // ── Resolve client ID: explicit > name-match ───────────────
  let resolvedClientId = clientId || undefined;

  if (!resolvedClientId && message) {
    const messageLower = message.toLowerCase();
    const clients = allClientsResult.data || [];
    const matched = clients.find((c: Record<string, unknown>) => {
      const full = `${((c.first_name as string) || "").toLowerCase()} ${((c.last_name as string) || "").toLowerCase()}`.trim();
      return full.length > 4 && messageLower.includes(full);
    });
    if (matched) {
      resolvedClientId = (matched as Record<string, unknown>).id as string;
    }
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
    pageContext: pageContext || { page: "metis_chat" },
  };
}
