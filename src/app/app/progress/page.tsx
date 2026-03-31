import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { redirect } from "next/navigation";
import { ProgressDashboard } from "./_components/ProgressDashboard";

export default async function ProgressPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/app");

  const admin = createSupabaseAdminClient();

  const [categoriesResult, progressResult, completionsResult, studentsResult] = await Promise.all([
    admin.from("service_categories").select("id, name, code, required_count, sort_order, requires_photos")
      .eq("workspace_id", workspaceId).eq("active", true).order("sort_order", { ascending: true }),
    admin.from("curriculum_progress").select("student_id, category_id, completed_count, verified_count")
      .eq("workspace_id", workspaceId),
    admin.from("service_completions")
      .select("id, student_id, student_name, category_id, completed_at, verified, service_categories(name)")
      .eq("workspace_id", workspaceId).order("completed_at", { ascending: false }).limit(30),
    admin.from("floor_status").select("student_id, student_name")
      .eq("workspace_id", workspaceId).order("student_name", { ascending: true }),
  ]);

  const categories = (categoriesResult.data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string, name: c.name as string, code: c.code as string,
    requiredCount: c.required_count as number,
    requires_photos: c.requires_photos as boolean,
  }));

  const studentMap: Record<string, { studentId: string; studentName: string; categories: Record<string, { completed: number; verified: number }> }> = {};
  for (const s of (studentsResult.data || [])) {
    studentMap[s.student_id as string] = {
      studentId: s.student_id as string,
      studentName: s.student_name as string,
      categories: {},
    };
  }
  for (const p of (progressResult.data || [])) {
    const sid = p.student_id as string;
    if (studentMap[sid]) {
      studentMap[sid].categories[p.category_id as string] = {
        completed: (p.completed_count as number) || 0,
        verified: (p.verified_count as number) || 0,
      };
    }
  }

  const completions = (completionsResult.data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string, studentId: c.student_id as string,
    studentName: (c.student_name as string) || "Unknown",
    categoryName: (c.service_categories as Record<string, unknown>)?.name as string || "Unknown",
    completedAt: c.completed_at as string, verified: c.verified as boolean,
  }));

  return (
    <ProgressDashboard
      initialCategories={categories}
      initialStudents={Object.values(studentMap)}
      initialCompletions={completions}
    />
  );
}
