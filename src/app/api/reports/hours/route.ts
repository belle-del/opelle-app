import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getHoursReport, toCSV } from "@/lib/db/reports";
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

    if (!hasPermission(role, "hours.view_all", overrides) && !hasPermission(role, "hours.view_own", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const startDate = params.get("start_date") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = params.get("end_date") || new Date().toISOString().slice(0, 10);
    const format = params.get("format");

    let studentId = params.get("student_id") || undefined;
    if (!hasPermission(role, "hours.view_all", overrides)) {
      studentId = user.id;
    }

    const report = await getHoursReport(workspaceId, { startDate, endDate }, studentId);

    if (format === "csv") {
      const csv = toCSV(
        ["studentName", "totalHours", "verifiedHours"],
        report.byStudent.map((s) => ({ studentName: s.studentName, totalHours: s.totalHours, verifiedHours: s.verifiedHours })),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=hours-report-${startDate}-to-${endDate}.csv`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Hours report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
