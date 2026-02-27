// src/lib/kernel.ts
// All communication with Dominus OS Kernel goes through this file.
// If the Kernel is unavailable, all functions return null — never throw.

import type { ClientPreferenceProfile, ProductEnrichment } from "@/lib/types";

const KERNEL_URL =
  process.env.KERNEL_API_URL || "https://kernel.dominusfoundry.com";
const KERNEL_KEY = process.env.KERNEL_API_KEY || "";
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
    const res = await fetch(`${KERNEL_URL}/api/v1/opelle/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Opelle-API-Key": KERNEL_KEY,
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

export async function getClientProfile(
  clientId: string
): Promise<ClientPreferenceProfile | null> {
  return kernelGet(`/api/v1/opelle/clients/${clientId}/profile`, "profile");
}

export async function getInventoryPredictions(workspaceId: string) {
  return kernelGet(
    `/api/v1/opelle/inventory/predictions?workspace_id=${workspaceId}`
  );
}

export async function getProductEnrichment(
  productId: string
): Promise<ProductEnrichment | null> {
  return kernelGet(
    `/api/v1/opelle/products/${productId}/enrichment`,
    "enrichment"
  );
}

export async function getFormulaSuggestion(
  workspaceId: string,
  clientId: string,
  serviceTypeName: string
) {
  return kernelPost("/api/v1/opelle/formulas/suggest", {
    workspace_id: workspaceId,
    client_id: clientId,
    service_type_name: serviceTypeName,
  });
}

export async function getClientRebook(clientId: string) {
  return kernelGet(`/api/v1/opelle/clients/${clientId}/rebook`);
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
      headers: { "X-Opelle-API-Key": KERNEL_KEY },
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
  body: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  if (!KERNEL_ENABLED || !KERNEL_KEY) return null;

  try {
    const res = await fetch(`${KERNEL_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Opelle-API-Key": KERNEL_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
