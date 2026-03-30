import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { randomUUID } from "crypto";

// Demo seed data — creates mock students for the floor view
// Call POST /api/floor/seed to populate

const DEMO_STUDENTS = [
  "Maya Johnson",
  "Sophia Chen",
  "Isabella Rodriguez",
  "Ava Williams",
  "Emma Thompson",
  "Olivia Davis",
  "Mia Martinez",
  "Charlotte Brown",
  "Amelia Wilson",
  "Harper Anderson",
  "Ella Taylor",
  "Lily Garcia",
];

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    // Check if seed data already exists
    const { data: existing } = await admin
      .from("floor_status")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: "Seed data already exists", count: existing.length });
    }

    // Insert demo students
    const rows = DEMO_STUDENTS.map((name) => ({
      workspace_id: workspaceId,
      student_id: randomUUID(),
      student_name: name,
      status: "clocked_out",
    }));

    const { error } = await admin.from("floor_status").insert(rows);

    if (error) {
      console.error("Seed error:", error);
      return NextResponse.json({ error: "Failed to seed", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length, students: DEMO_STUDENTS });
  } catch (err) {
    console.error("Seed route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
