import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { studentId, studentName, categoryId, clientId, notes } = await req.json();
    if (!studentId || !categoryId) {
      return NextResponse.json({ error: "studentId and categoryId required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    // 1. Insert service completion
    const { data: completion, error: insertError } = await admin
      .from("service_completions")
      .insert({
        workspace_id: workspaceId,
        student_id: studentId,
        student_name: studentName || "",
        category_id: categoryId,
        client_id: clientId || null,
        completed_at: now,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Service completion insert error:", insertError);
      return NextResponse.json({ error: "Failed to log completion" }, { status: 500 });
    }

    // 2. Upsert curriculum progress
    const { data: existing } = await admin
      .from("curriculum_progress")
      .select("id, completed_count")
      .eq("workspace_id", workspaceId)
      .eq("student_id", studentId)
      .eq("category_id", categoryId)
      .single();

    if (existing) {
      await admin
        .from("curriculum_progress")
        .update({
          completed_count: (existing.completed_count || 0) + 1,
          last_completed_at: now,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("curriculum_progress").insert({
        workspace_id: workspaceId,
        student_id: studentId,
        category_id: categoryId,
        completed_count: 1,
        last_completed_at: now,
      });
    }

    return NextResponse.json({
      success: true,
      completionId: completion?.id,
    });
  } catch (err) {
    console.error("Service complete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
