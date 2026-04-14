import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listLessons, createLesson, updateLesson, deleteLesson, listFeedback } from "@/lib/db/metis-feedback";
import { distillLessons } from "@/lib/kernel";
import { logActivity } from "@/lib/db/activity-log";
import type { MetisLessonCategory, MetisEntityType } from "@/lib/types";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as MetisLessonCategory | null;
    const entityType = searchParams.get("entityType") as MetisEntityType | null;
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const lessons = await listLessons({
      category: category || undefined,
      entityType: entityType || undefined,
      activeOnly,
    });

    return NextResponse.json({ lessons });
  } catch (err) {
    console.error("Lessons list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Manual lesson creation
    if (body.action === "create") {
      const { lesson, category, entityType, entityId } = body;
      if (!lesson || !category) {
        return NextResponse.json({ error: "lesson and category are required" }, { status: 400 });
      }

      const created = await createLesson({ lesson, category, entityType, entityId });
      if (!created) return NextResponse.json({ error: "Failed to create" }, { status: 500 });

      await logActivity("metis.lesson_created", "metis", created.id, lesson.substring(0, 50));
      return NextResponse.json({ lesson: created });
    }

    // Auto-distill lessons from recent feedback
    if (body.action === "distill") {
      const feedback = await listFeedback({ limit: 50 });
      if (feedback.length === 0) {
        return NextResponse.json({ lessons: [], message: "No feedback to distill" });
      }

      const existingLessons = await listLessons({ activeOnly: true });
      const existingTexts = existingLessons.map((l) => l.lesson.toLowerCase());

      // Try AI-powered distillation via kernel, fall back to direct creation
      const created: Awaited<ReturnType<typeof createLesson>>[] = [];
      try {
        const result = await distillLessons({
          feedbackItems: feedback.map((f) => ({
            source: f.source,
            originalContent: f.originalContent ?? null,
            correction: f.correction ?? null,
            feedbackType: f.feedbackType,
            entityType: f.entityType ?? null,
            entityId: f.entityId ?? null,
          })),
          existingLessons: existingLessons.map((l) => l.lesson),
        });

        if (result?.lessons?.length) {
          for (const l of result.lessons) {
            const lesson = await createLesson({
              lesson: l.lesson,
              category: l.category as MetisLessonCategory,
              entityType: l.entityType as MetisEntityType | undefined,
              entityId: l.entityId ?? undefined,
              confidence: l.confidence,
              sourceFeedbackIds: feedback.map((f) => f.id),
            });
            if (lesson) created.push(lesson);
          }
        }
      } catch {
        // Kernel unavailable — fall back to creating lessons directly from feedback
        const categoryMap: Record<string, MetisLessonCategory> = {
          correction: "technique",
          preference: "preference",
          note: "general",
        };

        for (const f of feedback) {
          const text = f.correction?.trim();
          if (!text || existingTexts.includes(text.toLowerCase())) continue;

          const lesson = await createLesson({
            lesson: text,
            category: categoryMap[f.feedbackType] || "general",
            entityType: (f.entityType as MetisEntityType) || undefined,
            entityId: f.entityId || undefined,
            sourceFeedbackIds: [f.id],
            confidence: 0.8,
          });
          if (lesson) {
            created.push(lesson);
            existingTexts.push(text.toLowerCase());
          }
        }
      }

      if (created.length === 0) {
        return NextResponse.json({ lessons: [], message: "No new lessons distilled" });
      }

      await logActivity("metis.lessons_distilled", "metis", "distill", `${created.length} lessons created`);
      return NextResponse.json({ lessons: created });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Lessons create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, lesson, category, active, confidence } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updated = await updateLesson(id, { lesson, category, active, confidence });
    if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

    return NextResponse.json({ lesson: updated });
  } catch (err) {
    console.error("Lessons update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ok = await deleteLesson(id);
    return NextResponse.json({ success: ok });
  } catch (err) {
    console.error("Lessons delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
