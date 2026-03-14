// src/lib/kernel.ts
// All communication with MetisOS Opelle Kernel goes through this file.
// If the Kernel is unavailable, all functions return null — never throw.

import type { ClientPreferenceProfile, ProductEnrichment, InspoAnalysis, ParsedFormula } from "@/lib/types";

const KERNEL_URL =
  process.env.KERNEL_API_URL || "https://opelle.dominusfoundry.com";
const KERNEL_KEY = process.env.KERNEL_AUTH_KEY || "";
const KERNEL_ENABLED = process.env.KERNEL_ENABLED === "true";

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
  if (!KERNEL_ENABLED || !KERNEL_KEY) return null;

  try {
    const res = await fetch(`${KERNEL_URL}/api/v1/saas/events/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kernel-Auth": KERNEL_KEY,
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
  const result = await kernelPost("/api/v1/saas/ai/client-profile", {
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
  return kernelPost("/api/v1/saas/ai/rebook-message", {
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
  const result = await kernelPost("/api/v1/saas/ai/product-enrichment", {
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
}) {
  return kernelPost("/api/v1/saas/ai/suggest-formula", {
    client_name: params.clientName,
    service_type_name: params.serviceTypeName,
    formula_history: params.formulaHistory,
    client_preferences: params.clientPreferences ?? null,
  }, 20000);
}

// Phase E — no UI consumer yet
export async function getInventoryPredictions(workspaceId: string) {
  return kernelGet(
    `/api/v1/saas/inventory/predictions?workspace_id=${workspaceId}`
  );
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
  return kernelPost("/api/v1/saas/ai/analyze-inspo", {
    images: params.images,
    client_context: params.clientContext,
    client_notes: params.clientNotes,
    formula_history: params.formulaHistory,
  }, 60000); // 60s timeout for vision analysis
}

export async function parseFormula(
  rawNotes: string
): Promise<{ success: boolean; parsed: ParsedFormula } | null> {
  return kernelPost("/api/v1/saas/ai/parse-formula", {
    raw_notes: rawNotes,
  }, 30000); // 30s timeout for AI parsing
}

// --- INTERNAL HELPERS ---

async function kernelGet(
  path: string,
  extract?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  if (!KERNEL_ENABLED || !KERNEL_KEY) return null;

  try {
    const res = await fetch(`${KERNEL_URL}${path}`, {
      headers: { "X-Kernel-Auth": KERNEL_KEY },
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
  if (!KERNEL_ENABLED || !KERNEL_KEY) return null;

  try {
    const res = await fetch(`${KERNEL_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kernel-Auth": KERNEL_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
