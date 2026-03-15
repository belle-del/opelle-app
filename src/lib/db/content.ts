import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ContentPost, ContentPostRow } from "@/lib/types";
import { contentPostRowToModel } from "@/lib/types";

export async function getPublishedContent(workspaceId: string): Promise<ContentPost[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return (data as ContentPostRow[]).map(contentPostRowToModel);
}

export async function getAllContent(workspaceId: string): Promise<ContentPost[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ContentPostRow[]).map(contentPostRowToModel);
}

export async function getContentPost(id: string): Promise<ContentPost | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return contentPostRowToModel(data as ContentPostRow);
}

export async function createContentPost(params: {
  workspaceId: string;
  title: string;
  body: string;
  category: "tip" | "product_spotlight" | "seasonal";
  publish?: boolean;
}): Promise<ContentPost> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_posts")
    .insert({
      workspace_id: params.workspaceId,
      title: params.title,
      body: params.body,
      category: params.category,
      published_at: params.publish ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to create content post: ${error?.message}`);
  return contentPostRowToModel(data as ContentPostRow);
}

export async function updateContentPost(
  id: string,
  params: { title?: string; body?: string; category?: string }
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.title !== undefined) updateData.title = params.title;
  if (params.body !== undefined) updateData.body = params.body;
  if (params.category !== undefined) updateData.category = params.category;

  const { error } = await supabase
    .from("content_posts")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(`Failed to update content post: ${error.message}`);
}

export async function publishContentPost(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("content_posts")
    .update({ published_at: now, updated_at: now })
    .eq("id", id);

  if (error) throw new Error(`Failed to publish content post: ${error.message}`);
}
