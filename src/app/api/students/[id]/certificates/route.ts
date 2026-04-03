import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listStudentCertificates } from "@/lib/db/badges";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id: studentId } = await params;
    const certificates = await listStudentCertificates(workspaceId, studentId);
    return NextResponse.json({ certificates });
  } catch (err) {
    console.error("Student certificates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
