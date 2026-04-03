import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getRevenueReport, toCSV } from "@/lib/db/reports";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "reports.view", overrides) && !hasPermission(role, "earnings.view_own", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const startDate = params.get("start_date") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = params.get("end_date") || new Date().toISOString().slice(0, 10);
    const format = params.get("format");

    // student_id filter from query param only (floor_status.student_id ≠ auth user id,
    // so we can't auto-filter by user.id — data is workspace-scoped instead)
    const studentId = params.get("student_id") || undefined;

    const report = await getRevenueReport(workspaceId, { startDate, endDate }, studentId);

    if (format === "csv") {
      const csv = toCSV(
        ["date", "revenue", "tips"],
        report.byDay.map((d) => ({ date: d.date, revenue: d.revenue, tips: d.tips })),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=revenue-report-${startDate}-to-${endDate}.csv`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Revenue report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
