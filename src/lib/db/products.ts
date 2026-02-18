import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product, ProductRow, ProductCategory } from "@/lib/types";
import { productRowToModel } from "@/lib/types";
import { getCurrentWorkspace } from "./workspaces";

export async function listProducts(): Promise<Product[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("brand", { ascending: true })
    .order("shade", { ascending: true });

  if (error || !data) return [];
  return (data as ProductRow[]).map(productRowToModel);
}

export async function getProduct(id: string): Promise<Product | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !data) return null;
  return productRowToModel(data as ProductRow);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = await createSupabaseServerClient();
  const searchTerm = `%${query}%`;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", workspace.id)
    .or(`brand.ilike.${searchTerm},shade.ilike.${searchTerm},name.ilike.${searchTerm},line.ilike.${searchTerm},barcode.ilike.${searchTerm}`)
    .order("brand", { ascending: true })
    .limit(20);

  if (error || !data) return [];
  return (data as ProductRow[]).map(productRowToModel);
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("barcode", barcode)
    .single();

  if (error || !data) return null;
  return productRowToModel(data as ProductRow);
}

export async function createProduct(input: {
  brand: string;
  shade: string;
  category: ProductCategory;
  line?: string;
  name?: string;
  sizeOz?: number;
  sizeGrams?: number;
  costCents?: number;
  barcode?: string;
  quantity?: number;
  lowStockThreshold?: number;
  notes?: string;
}): Promise<Product | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      workspace_id: workspace.id,
      brand: input.brand,
      line: input.line || null,
      shade: input.shade,
      name: input.name || null,
      category: input.category,
      size_oz: input.sizeOz || null,
      size_grams: input.sizeGrams || null,
      cost_cents: input.costCents || null,
      barcode: input.barcode || null,
      quantity: input.quantity ?? 0,
      low_stock_threshold: input.lowStockThreshold ?? 2,
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return productRowToModel(data as ProductRow);
}

export async function updateProduct(
  id: string,
  input: {
    brand?: string;
    shade?: string;
    category?: ProductCategory;
    line?: string;
    name?: string;
    sizeOz?: number;
    sizeGrams?: number;
    costCents?: number;
    barcode?: string;
    quantity?: number;
    lowStockThreshold?: number;
    notes?: string;
  }
): Promise<Product | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();

  const updateData: Record<string, unknown> = {};
  if (input.brand !== undefined) updateData.brand = input.brand;
  if (input.line !== undefined) updateData.line = input.line || null;
  if (input.shade !== undefined) updateData.shade = input.shade;
  if (input.name !== undefined) updateData.name = input.name || null;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.sizeOz !== undefined) updateData.size_oz = input.sizeOz || null;
  if (input.sizeGrams !== undefined) updateData.size_grams = input.sizeGrams || null;
  if (input.costCents !== undefined) updateData.cost_cents = input.costCents || null;
  if (input.barcode !== undefined) updateData.barcode = input.barcode || null;
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.lowStockThreshold !== undefined) updateData.low_stock_threshold = input.lowStockThreshold;
  if (input.notes !== undefined) updateData.notes = input.notes || null;

  const { data, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return productRowToModel(data as ProductRow);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}

export async function adjustProductQuantity(id: string, delta: number): Promise<Product | null> {
  const product = await getProduct(id);
  if (!product) return null;

  const newQuantity = Math.max(0, product.quantity + delta);
  return updateProduct(id, { quantity: newQuantity });
}
