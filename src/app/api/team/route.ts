import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/db/team";
import { listTeamMembers } from "@/lib/db/team";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const auth = await requirePermission("team.view");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const members = await listTeamMembers(auth.workspaceId);
    return NextResponse.json({ members });
  } catch (err) {
    console.error("[team] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("team.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userId, role, displayName, email, phone, hireDate, payType } = await req.json();
    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role required" }, { status: 400 });
    }

    const validRoles = ["admin", "instructor", "stylist", "student", "front_desk"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("workspace_members")
      .insert({
        workspace_id: auth.workspaceId,
        user_id: userId,
        role,
        display_name: displayName || null,
        email: email || null,
        phone: phone || null,
        hire_date: hireDate || null,
        pay_type: payType || "hourly",
        status: "active",
      })
      .select("*")
      .single();

    if (error) {
      console.error("[team] POST error:", error.message);
      return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
    }

    return NextResponse.json({ member: data }, { status: 201 });
  } catch (err) {
    console.error("[team] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
