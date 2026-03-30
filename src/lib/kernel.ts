// src/lib/kernel.ts
// All communication with MetisOS Opelle Kernel goes through this file.
// If the Kernel is unavailable, all functions return null — never throw.

import type { ClientPreferenceProfile, ProductEnrichment, InspoAnalysis, ParsedFormula, InventoryPredictionsResult, MetisChatResponse, MetisSuggestionsResult } from "@/lib/types";

function getKernelUrl() {
  return process.env.KERNEL_API_URL || process.env.KERNEL_WEBHOOK_URL || "https://opelle.dominusfoundry.com";
}
function getKernelKey() {
  return process.env.KERNEL_AUTH_KEY || process.env.KERNEL_API_KEY || "";
}
function isKernelEnabled() {
  return process.env.KERNEL_ENABLED === "true" || !!getKernelKey();
}

export interface KernelEventPayload {
  event_type: string;
  workspace_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// --- EVENT PUBLISHING (fire and forget) ---

export async function publishEvent(
  event: KernelEventPayload
): Promise<string | null> {
  if (!isKernelEnabled() || !getKernelKey()) return null;

  try {
    const res = await fetch(`${getKernelUrl()}/api/v1/events/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kernel-Auth": getKernelKey(),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`Kernel event rejected: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.event_id ?? null;
  } catch (err) {
    console.error("Kernel unreachable:", err);
    return null;
  }
}

// --- CORTEX-POWERED INTELLIGENCE (Phase D) ---

export async function getClientProfile(params: {
  clientName: string;
  clientNotes: string | null;
  tags: string[];
  formulaHistory: {
    service_date: string;
    raw_notes: string;
    general_notes?: string;
  }[];
  appointmentHistory: {
    service_name: string;
    start_at: string;
    status: string;
  }[];
}): Promise<ClientPreferenceProfile | null> {
  const result = await kernelPost("/api/v1/ai/client-profile", {
    client_name: params.clientName,
    client_notes: params.clientNotes,
    tags: params.tags,
    formula_history: params.formulaHistory,
    appointment_history: params.appointmentHistory,
  }, 15000);
  return result?.profile ?? null;
}

export async function getRebookMessage(params: {
  clientName: string;
  daysSinceLastVisit: number;
  avgCadenceDays: number;
  urgency: string;
  lastServiceName: string;
  lastServiceDate: string;
}): Promise<{ suggested_message: string } | null> {
  return kernelPost("/api/v1/ai/rebook-message", {
    client_name: params.clientName,
    days_since_last_visit: params.daysSinceLastVisit,
    avg_cadence_days: params.avgCadenceDays,
    urgency: params.urgency,
    last_service_name: params.lastServiceName,
    last_service_date: params.lastServiceDate,
  }, 10000);
}

export async function getProductEnrichment(params: {
  brand: string;
  line?: string;
  shade: string;
  category: string;
  name?: string;
  notes?: string;
}): Promise<ProductEnrichment | null> {
  const result = await kernelPost("/api/v1/ai/product-enrichment", {
    brand: params.brand,
    line: params.line ?? null,
    shade: params.shade,
    category: params.category,
    name: params.name ?? null,
    notes: params.notes ?? null,
  }, 15000);
  return result?.enrichment ?? null;
}

export async function getFormulaSuggestion(params: {
  clientName: string;
  serviceTypeName: string;
  formulaHistory: {
    service_date: string;
    raw_notes: string;
    general_notes?: string;
    parsed_formula?: unknown;
  }[];
  clientPreferences?: ClientPreferenceProfile | null;
  productCatalog?: string[] | null;
}) {
  return kernelPost("/api/v1/ai/suggest-formula", {
    client_name: params.clientName,
    service_type_name: params.serviceTypeName,
    formula_history: params.formulaHistory,
    client_preferences: params.clientPreferences ?? null,
    product_catalog: params.productCatalog ?? null,
  }, 20000);
}

export async function getInventoryPredictions(params: {
  products: {
    id: string;
    brand: string;
    shade: string;
    line?: string;
    category: string;
    quantity: number;
    sizeOz?: number;
    costCents?: number;
    lowStockThreshold: number;
    avgUsageOzPerAppointment?: number;
  }[];
  usageHistory: {
    productId: string;
    brand: string;
    shade: string;
    amountUsed?: string;
    serviceDate: string;
  }[];
  totalFormulaEntries: number;
  dateRange: { earliest: string; latest: string };
}): Promise<InventoryPredictionsResult | null> {
  const result = await kernelPost("/api/v1/ai/inventory-predictions", {
    products: params.products,
    usage_history: params.usageHistory,
    total_formula_entries: params.totalFormulaEntries,
    date_range: params.dateRange,
  }, 15000);
  return result?.predictions_result ?? null;
}

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

// --- AI CALLS (routed through kernel — Immutable Rule 2) ---

export async function analyzeInspo(params: {
  images: { media_type: string; data: string }[];
  clientContext: {
    firstName?: string;
    lastName?: string;
    colorDirection?: string;
    maintenanceLevel?: string;
    styleNotes?: string;
    processingPreferences?: string;
  } | null;
  clientNotes: string | null;
  formulaHistory: string | null;
}): Promise<{ success: boolean; analysis: InspoAnalysis } | null> {
  return kernelPost("/api/v1/ai/analyze-inspo", {
    images: params.images,
    client_context: params.clientContext,
    client_notes: params.clientNotes,
    formula_history: params.formulaHistory,
  }, 60000); // 60s timeout for vision analysis
}

export async function parseFormula(
  rawNotes: string
): Promise<{ success: boolean; parsed: ParsedFormula } | null> {
  return kernelPost("/api/v1/ai/parse-formula", {
    raw_notes: rawNotes,
  }, 30000); // 30s timeout for AI parsing
}

// --- METIS AI COPILOT ---

export async function metisChat(params: {
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
  workspaceContext?: Record<string, unknown>;
}): Promise<MetisChatResponse | null> {
  const result = await kernelPost("/api/v1/ai/chat", {
    message: params.message,
    conversation_history: params.conversationHistory,
    context: params.context,
    workspace_context: params.workspaceContext,
  }, 30000);
  return result ?? null;
}

export async function distillLessons(params: {
  feedbackItems: {
    source: string;
    originalContent: string | null;
    correction: string | null;
    feedbackType: string;
    entityType: string | null;
    entityId: string | null;
  }[];
  existingLessons: string[];
}): Promise<{
  lessons: {
    lesson: string;
    category: string;
    entityType: string | null;
    entityId: string | null;
    confidence: number;
  }[];
} | null> {
  return kernelPost("/api/v1/ai/distill-lessons", {
    feedback_items: params.feedbackItems,
    existing_lessons: params.existingLessons,
  }, 30000);
}

export async function metisSuggestions(params: {
  page: string;
  entityType?: "client" | "product" | "formula" | "dashboard";
  entityData?: Record<string, unknown>;
}): Promise<MetisSuggestionsResult | null> {
  const result = await kernelPost("/api/v1/ai/suggestions", {
    page: params.page,
    entity_type: params.entityType,
    entity_data: params.entityData,
  }, 10000);
  return result ?? null;
}

// --- INSPO ANALYSIS (vision + intelligence — routed through kernel) ---

export async function analyzeInspoVision(params: {
  images: { mediaType: string; base64: string }[];
  categoryMeta?: { category: string; photoIndices: number[] }[];
  clientNotes: string | null;
  clientContext: {
    firstName?: string;
    lastName?: string;
    colorDirection?: string;
    maintenanceLevel?: string;
    styleNotes?: string;
    processingPreferences?: string;
  } | null;
  formulaHistory: string | null;
}): Promise<{
  questions: { id: string; question: string; type: string; options?: string[]; photoIndex?: number }[];
  clientSummary: string;
} | null> {
  return kernelPost("/api/v1/ai/analyze-inspo-vision", {
    images: params.images,
    category_meta: params.categoryMeta ?? null,
    client_notes: params.clientNotes,
    client_context: params.clientContext,
    formula_history: params.formulaHistory,
  }, 60000); // 60s for vision
}

export async function generateStylistIntel(params: {
  questions: { id: string; question: string; type: string; options?: string[] }[];
  answers: Record<string, string>;
  clientSummary: string | null;
  clientNotes: string | null;
  clientContext: {
    firstName?: string;
    colorDirection?: string;
    maintenanceLevel?: string;
    styleNotes?: string;
  } | null;
  formulaHistory: string | null;
}): Promise<{
  whatWasLearned: string;
  appointmentPrep: string;
  keyPreferences: string[];
  potentialChallenges: string[];
  productSuggestions: string[];
} | null> {
  return kernelPost("/api/v1/ai/stylist-intelligence", {
    questions: params.questions,
    answers: params.answers,
    client_summary: params.clientSummary,
    client_notes: params.clientNotes,
    client_context: params.clientContext,
    formula_history: params.formulaHistory,
  }, 30000);
}

export async function generateApptFlag(params: {
  intelligenceSummary: string;
  appointmentPrep: string;
  potentialChallenges: string[];
  nextAppointment: {
    serviceName: string;
    durationMins: number;
    startAt: string;
  };
}): Promise<{
  severity: "warning" | "critical";
  message: string;
} | null> {
  return kernelPost("/api/v1/ai/appointment-flag", {
    intelligence_summary: params.intelligenceSummary,
    appointment_prep: params.appointmentPrep,
    potential_challenges: params.potentialChallenges,
    next_appointment: params.nextAppointment,
  }, 15000);
}

export async function generateInspoFormula(params: {
  stylistIntelligence: {
    whatWasLearned: string;
    appointmentPrep: string;
    keyPreferences: string[];
    potentialChallenges: string[];
    productSuggestions: string[];
  };
  clientSummary: string | null;
  formulaHistory: string | null;
  clientContext: {
    firstName?: string;
    colorDirection?: string;
    maintenanceLevel?: string;
    styleNotes?: string;
  } | null;
  questions?: { id: string; question: string; type: string; options?: string[] }[];
  answers?: Record<string, string>;
  productCatalog?: string[] | null;
}): Promise<{
  suggested_formula: string;
  reasoning: string;
  confidence: number;
  caution?: string;
  based_on: "inspo";
} | null> {
  return kernelPost("/api/v1/ai/inspo-formula-suggestion", {
    stylist_intelligence: params.stylistIntelligence,
    client_summary: params.clientSummary,
    formula_history: params.formulaHistory,
    client_context: params.clientContext,
    questions: params.questions ?? null,
    answers: params.answers ?? null,
    product_catalog: params.productCatalog ?? null,
  }, 30000);
}

// --- INTERNAL HELPERS ---

async function kernelGet(
  path: string,
  extract?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  if (!isKernelEnabled() || !getKernelKey()) return null;

  try {
    const res = await fetch(`${getKernelUrl()}${path}`, {
      headers: { "X-Kernel-Auth": getKernelKey() },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return extract ? data[extract] ?? null : data;
  } catch {
    return null;
  }
}

async function kernelPost(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 10000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  if (!isKernelEnabled() || !getKernelKey()) {
    console.error(`KERNEL-DIAG: disabled or no key. KERNEL_ENABLED=${process.env.KERNEL_ENABLED}, hasKey=${!!getKernelKey()}`);
    return null;
  }

  try {
    const url = `${getKernelUrl()}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kernel-Auth": getKernelKey(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`KERNEL-DIAG: POST ${path} failed ${res.status}: ${errText.substring(0, 200)}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`KERNEL-DIAG: POST ${path} exception:`, err);
    return null;
  }
}
