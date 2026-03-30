import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    const [categoriesResult, progressResult, completionsResult, studentsResult] = await Promise.all([
      admin
        .from("service_categories")
        .select("id, name, code, required_count, sort_order")
        .eq("workspace_id", workspaceId)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("curriculum_progress")
        .select("student_id, category_id, completed_count, verified_count")
        .eq("workspace_id", workspaceId),
      admin
        .from("service_completions")
        .select("id, student_id, student_name, category_id, completed_at, verified, service_categories(name)")
        .eq("workspace_id", workspaceId)
        .order("completed_at", { ascending: false })
        .limit(30),
      admin
        .from("floor_status")
        .select("student_id, student_name")
        .eq("workspace_id", workspaceId)
        .order("student_name", { ascending: true }),
    ]);

    const categories = categoriesResult.data || [];
    const progress = progressResult.data || [];
    const completions = completionsResult.data || [];
    const students = studentsResult.data || [];

    // Build per-student progress
    const studentMap: Record<string, { studentId: string; studentName: string; categories: Record<string, { completed: number; verified: number }> }> = {};

    for (const s of students) {
      studentMap[s.student_id as string] = {
        studentId: s.student_id as string,
        studentName: s.student_name as string,
        categories: {},
      };
    }

    for (const p of progress) {
      const sid = p.student_id as string;
      if (!studentMap[sid]) continue;
      studentMap[sid].categories[p.category_id as string] = {
        completed: (p.completed_count as number) || 0,
        verified: (p.verified_count as number) || 0,
      };
    }

    return NextResponse.json({
      categories: categories.map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        requiredCount: c.required_count,
      })),
      students: Object.values(studentMap),
      recentCompletions: completions.map((c: Record<string, unknown>) => ({
        id: c.id,
        studentId: c.student_id,
        studentName: c.student_name,
        categoryName: (c.service_categories as Record<string, unknown>)?.name || "Unknown",
        completedAt: c.completed_at,
        verified: c.verified,
      })),
    });
  } catch (err) {
    console.error("Curriculum route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
