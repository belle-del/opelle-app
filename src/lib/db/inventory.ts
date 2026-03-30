import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "./workspaces";
import {
  StockMovement, StockMovementRow, StockMovementType, stockMovementRowToModel,
  StockAlert, StockAlertRow, StockAlertType, stockAlertRowToModel,
  ServiceProductUsage, ServiceProductUsageRow, serviceProductUsageRowToModel,
} from "@/lib/types";

async function resolveWorkspaceId(): Promise<string | undefined> {
  const workspace = await getCurrentWorkspace();
  if (workspace) return workspace.id;
  const admin = createSupabaseAdminClient();
  const { data: ws } = await admin.from("workspaces").select("id").limit(1).single();
  return ws?.id;
}

// ─── Stock Movements ──────────────────────────────────────────────────────

export async function createStockMovement(input: {
  workspaceId: string;
  productId: string;
  movementType: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  serviceCompletionId?: string;
  notes?: string;
  createdBy?: string;
}): Promise<StockMovement | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("stock_movements")
    .insert({
      workspace_id: input.workspaceId,
      product_id: input.productId,
      movement_type: input.movementType,
      quantity_change: input.quantityChange,
      previous_stock: input.previousStock,
      new_stock: input.newStock,
      service_completion_id: input.serviceCompletionId ?? null,
      notes: input.notes ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return stockMovementRowToModel(data as StockMovementRow);
}

export async function listMovements(options?: {
  workspaceId?: string;
  productId?: string;
  limit?: number;
}): Promise<StockMovement[]> {
  const wsId = options?.workspaceId ?? await resolveWorkspaceId();
  if (!wsId) return [];

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("stock_movements")
    .select("*")
    .eq("workspace_id", wsId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.productId) {
    query = query.eq("product_id", options.productId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as StockMovementRow[]).map(stockMovementRowToModel);
}

// ─── Stock Alerts ─────────────────────────────────────────────────────────

export async function upsertStockAlert(input: {
  workspaceId: string;
  productId: string;
  alertType: StockAlertType;
}): Promise<StockAlert | null> {
  const admin = createSupabaseAdminClient();

  // Check for existing unacknowledged alert of same type
  const { data: existing } = await admin
    .from("stock_alerts")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("product_id", input.productId)
    .eq("alert_type", input.alertType)
    .is("acknowledged_at", null)
    .single();

  if (existing) {
    return stockAlertRowToModel(existing as StockAlertRow);
  }

  const { data, error } = await admin
    .from("stock_alerts")
    .insert({
      workspace_id: input.workspaceId,
      product_id: input.productId,
      alert_type: input.alertType,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return stockAlertRowToModel(data as StockAlertRow);
}

export async function listActiveAlerts(workspaceId: string): Promise<StockAlert[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("stock_alerts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("acknowledged_at", null)
    .order("triggered_at", { ascending: false });

  if (error || !data) return [];
  return (data as StockAlertRow[]).map(stockAlertRowToModel);
}

export async function acknowledgeAlert(
  id: string,
  userId: string
): Promise<boolean> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) return false;

  const admin = createSupabaseAdminClient();
  const { error, count } = await admin
    .from("stock_alerts")
    .update(
      {
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
      },
      { count: "exact" }
    )
    .eq("id", id)
    .eq("workspace_id", wsId);

  return !error && (count ?? 0) > 0;
}

// ─── Service Product Usage ────────────────────────────────────────────────

export async function listServiceProductUsage(
  serviceCategoryId: string,
  workspaceId: string
): Promise<ServiceProductUsage[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("service_product_usage")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("service_category_id", serviceCategoryId);

  if (error || !data) return [];
  return (data as ServiceProductUsageRow[]).map(serviceProductUsageRowToModel);
}

export async function upsertServiceProductUsage(input: {
  workspaceId: string;
  serviceCategoryId: string;
  productId: string;
  estimatedQuantity: number;
  isRequired?: boolean;
}): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("service_product_usage")
    .upsert(
      {
        workspace_id: input.workspaceId,
        service_category_id: input.serviceCategoryId,
        product_id: input.productId,
        estimated_quantity: input.estimatedQuantity,
        is_required: input.isRequired ?? true,
      },
      { onConflict: "workspace_id,service_category_id,product_id" }
    );

  return !error;
}
