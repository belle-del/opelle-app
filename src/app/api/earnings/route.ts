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

    const { studentId, studentName, serviceAmount, tipAmount, serviceCategory, clientName } = await req.json();
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

    const admin = createSupabaseAdminClient();

    const { error } = await admin.from("student_earnings").insert({
      workspace_id: workspaceId,
      student_id: studentId,
      student_name: studentName || "",
      service_amount: serviceAmount || 0,
      tip_amount: tipAmount || 0,
      total_amount: (serviceAmount || 0) + (tipAmount || 0),
      service_category: serviceCategory || null,
      client_name: clientName || null,
    });

    if (error) {
      console.error("Earnings insert error:", error);
      return NextResponse.json({ error: "Failed to record earnings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Earnings route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
