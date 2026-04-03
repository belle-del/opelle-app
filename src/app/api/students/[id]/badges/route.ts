import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listStudentBadges, awardBadge } from "@/lib/db/badges";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id: studentId } = await params;
    const badges = await listStudentBadges(workspaceId, studentId);
    return NextResponse.json({ badges });
  } catch (err) {
    console.error("Student badges error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id: studentId } = await params;
    const { badge_id } = await req.json();

    if (!badge_id) {
      return NextResponse.json({ error: "badge_id required" }, { status: 400 });
    }

    const result = await awardBadge({
      workspaceId,
      studentId,
      badgeId: badge_id,
      awardedBy: user.id,
    });

    if (!result) {
      return NextResponse.json({ error: "Failed to award badge" }, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Award badge error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
