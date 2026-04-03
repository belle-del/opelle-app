import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { generateAndStoreCertificate } from "@/lib/db/badges";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { student_id, certificate_id } = await req.json();
    if (!student_id || !certificate_id) {
      return NextResponse.json({ error: "student_id and certificate_id required" }, { status: 400 });
    }

    const url = await generateAndStoreCertificate(workspaceId, student_id, certificate_id);
    if (!url) {
      return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
    }

    return NextResponse.json({ certificateUrl: url }, { status: 201 });
  } catch (err) {
    console.error("Certificate generation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
