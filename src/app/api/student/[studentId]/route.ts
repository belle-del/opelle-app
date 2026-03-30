import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { studentId } = await params;
    const admin = createSupabaseAdminClient();

    const [floorResult, totalsResult, entriesResult, categoriesResult, progressResult, completionsResult, earningsResult] = await Promise.all([
      admin.from("floor_status")
        .select("student_name, status, clocked_in_at, status_changed_at")
        .eq("workspace_id", workspaceId).eq("student_id", studentId).single(),

      admin.from("hour_totals")
        .select("total_hours, verified_hours")
        .eq("workspace_id", workspaceId).eq("student_id", studentId).single(),

      admin.from("time_entries")
        .select("id, clock_in, clock_out, duration_minutes, verified")
        .eq("workspace_id", workspaceId).eq("student_id", studentId)
        .order("clock_in", { ascending: false }).limit(10),

      admin.from("service_categories")
        .select("id, name, code, required_count, sort_order")
        .eq("workspace_id", workspaceId).eq("active", true)
        .order("sort_order", { ascending: true }),

      admin.from("curriculum_progress")
        .select("category_id, completed_count, verified_count")
        .eq("workspace_id", workspaceId).eq("student_id", studentId),

      admin.from("service_completions")
        .select("id, completed_at, verified, service_categories(name)")
        .eq("workspace_id", workspaceId).eq("student_id", studentId)
        .order("completed_at", { ascending: false }).limit(10),

      admin.from("student_earnings")
        .select("id, service_amount, tip_amount, total_amount, service_category, client_name, created_at")
        .eq("workspace_id", workspaceId).eq("student_id", studentId)
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const progressMap: Record<string, { completed: number; verified: number }> = {};
    for (const p of (progressResult.data || [])) {
      progressMap[p.category_id as string] = {
        completed: (p.completed_count as number) || 0,
        verified: (p.verified_count as number) || 0,
      };
    }

    return NextResponse.json({
      studentName: floorResult.data?.student_name || "Unknown",
      status: floorResult.data?.status || "clocked_out",
      clockedInAt: floorResult.data?.clocked_in_at,
      totalHours: Number(totalsResult.data?.total_hours) || 0,
      verifiedHours: Number(totalsResult.data?.verified_hours) || 0,
      categories: (categoriesResult.data || []).map((c: Record<string, unknown>) => ({
        id: c.id, name: c.name, code: c.code,
        requiredCount: c.required_count as number,
        completed: progressMap[c.id as string]?.completed || 0,
      })),
      recentEntries: (entriesResult.data || []).map((e: Record<string, unknown>) => ({
        id: e.id, clockIn: e.clock_in, clockOut: e.clock_out,
        durationMinutes: e.duration_minutes, verified: e.verified,
      })),
      recentCompletions: (completionsResult.data || []).map((c: Record<string, unknown>) => ({
        id: c.id, completedAt: c.completed_at, verified: c.verified,
        categoryName: (c.service_categories as Record<string, unknown>)?.name || "Unknown",
      })),
      earnings: {
        totalService: (earningsResult.data || []).reduce((sum: number, e: Record<string, unknown>) => sum + (Number(e.service_amount) || 0), 0),
        totalTips: (earningsResult.data || []).reduce((sum: number, e: Record<string, unknown>) => sum + (Number(e.tip_amount) || 0), 0),
        totalNet: (earningsResult.data || []).reduce((sum: number, e: Record<string, unknown>) => sum + (Number(e.total_amount) || 0), 0),
        transactionCount: (earningsResult.data || []).length,
        recent: (earningsResult.data || []).slice(0, 5).map((e: Record<string, unknown>) => ({
          id: e.id,
          serviceAmount: Number(e.service_amount) || 0,
          tipAmount: Number(e.tip_amount) || 0,
          totalAmount: Number(e.total_amount) || 0,
          serviceCategory: e.service_category,
          clientName: e.client_name,
          date: e.created_at,
        })),
      },
    });
  } catch (err) {
    console.error("Student profile error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
