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

// --- ENRICHMENT QUERIES ---
// These functions will be wired to real kernel endpoints in later phases.
// For now they use the correct auth but point to routes that will be
// built during Phase C (AI migration) and Phase D (cortex features).

export async function getClientProfile(
  clientId: string
): Promise<ClientPreferenceProfile | null> {
  return kernelGet(`/api/v1/saas/clients/${clientId}/profile`, "profile");
}

export async function getInventoryPredictions(workspaceId: string) {
  return kernelGet(
    `/api/v1/saas/inventory/predictions?workspace_id=${workspaceId}`
  );
}

export async function getProductEnrichment(
  productId: string
): Promise<ProductEnrichment | null> {
  return kernelGet(
    `/api/v1/saas/products/${productId}/enrichment`,
    "enrichment"
  );
}

export async function getFormulaSuggestion(
  workspaceId: string,
  clientId: string,
  serviceTypeName: string
) {
  return kernelPost("/api/v1/saas/formulas/suggest", {
    workspace_id: workspaceId,
    client_id: clientId,
    service_type_name: serviceTypeName,
  });
}

export async function getClientRebook(clientId: string) {
  return kernelGet(`/api/v1/saas/clients/${clientId}/rebook`);
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
