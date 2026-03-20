import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type MetisFeedback,
  type MetisLesson,
  type MetisFeedbackRow,
  type MetisLessonRow,
  type MetisFeedbackSource,
  type MetisFeedbackType,
  type MetisEntityType,
  type MetisLessonCategory,
  metisFeedbackRowToModel,
  metisLessonRowToModel,
} from "@/lib/types";

// ── Feedback CRUD ──────────────────────────────────────────

export async function createFeedback(input: {
  source: MetisFeedbackSource;
  sourceId?: string;
  originalContent?: string;
  correction?: string;
  feedbackType: MetisFeedbackType;
  entityType?: MetisEntityType;
  entityId?: string;
}): Promise<MetisFeedback | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("metis_feedback")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      source: input.source,
      source_id: input.sourceId ?? null,
      original_content: input.originalContent ?? null,
      correction: input.correction ?? null,
      feedback_type: input.feedbackType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("metis-feedback: insert error:", error?.message);
    return null;
  }

  return metisFeedbackRowToModel(data as MetisFeedbackRow);
}

export async function listFeedback(filters?: {
  source?: MetisFeedbackSource;
  feedbackType?: MetisFeedbackType;
  entityType?: MetisEntityType;
  entityId?: string;
  limit?: number;
}): Promise<MetisFeedback[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("metis_feedback")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (filters?.source) query = query.eq("source", filters.source);
  if (filters?.feedbackType) query = query.eq("feedback_type", filters.feedbackType);
  if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters?.entityId) query = query.eq("entity_id", filters.entityId);
  if (filters?.limit) query = query.limit(filters.limit);
  else query = query.limit(100);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as MetisFeedbackRow[]).map(metisFeedbackRowToModel);
}

export async function deleteFeedback(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("metis_feedback")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}

// ── Lessons CRUD ───────────────────────────────────────────

export async function createLesson(input: {
  lesson: string;
  category: MetisLessonCategory;
  entityType?: MetisEntityType;
  entityId?: string;
  sourceFeedbackIds?: string[];
  confidence?: number;
}): Promise<MetisLesson | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("metis_lessons")
    .insert({
      workspace_id: workspace.id,
      lesson: input.lesson,
      category: input.category,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      source_feedback_ids: input.sourceFeedbackIds ?? [],
      confidence: input.confidence ?? 1.0,
      active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("metis-lessons: insert error:", error?.message);
    return null;
  }

  return metisLessonRowToModel(data as MetisLessonRow);
}

export async function listLessons(filters?: {
  category?: MetisLessonCategory;
  entityType?: MetisEntityType;
  entityId?: string;
  activeOnly?: boolean;
}): Promise<MetisLesson[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("metis_lessons")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false });

  if (filters?.activeOnly !== false) query = query.eq("active", true);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters?.entityId) query = query.eq("entity_id", filters.entityId);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as MetisLessonRow[]).map(metisLessonRowToModel);
}

export async function updateLesson(
  id: string,
  input: { lesson?: string; category?: MetisLessonCategory; active?: boolean; confidence?: number }
): Promise<MetisLesson | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const admin = createSupabaseAdminClient();
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.lesson !== undefined) updateData.lesson = input.lesson;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.active !== undefined) updateData.active = input.active;
  if (input.confidence !== undefined) updateData.confidence = input.confidence;

  const { data, error } = await admin
    .from("metis_lessons")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) return null;
  return metisLessonRowToModel(data as MetisLessonRow);
}

export async function deleteLesson(id: string): Promise<boolean> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return false;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("metis_lessons")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  return !error;
}

// ── Active lessons for chat context ────────────────────────

export async function getActiveLessonsForContext(entityType?: MetisEntityType, entityId?: string): Promise<string[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const admin = createSupabaseAdminClient();

  // Get general lessons + entity-specific lessons
  let query = admin
    .from("metis_lessons")
    .select("lesson, category, entity_type, entity_id")
    .eq("workspace_id", workspace.id)
    .eq("active", true)
    .order("confidence", { ascending: false })
    .limit(50);

  const { data, error } = await query;
  if (error || !data) return [];

  // Prioritize: entity-specific first, then general
  const lessons = data as Pick<MetisLessonRow, "lesson" | "category" | "entity_type" | "entity_id">[];
  const entitySpecific = lessons.filter(
    (l) => entityType && l.entity_type === entityType && (!entityId || l.entity_id === entityId)
  );
  const general = lessons.filter((l) => !l.entity_type || l.entity_type === "general");

  return [...entitySpecific, ...general].map((l) => l.lesson);
}
