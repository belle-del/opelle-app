import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { addProcess } from "@/lib/db/service-sessions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const body = await req.json();
    if (!body.name || !body.durationMinutes) {
      return NextResponse.json({ error: "name and durationMinutes required" }, { status: 400 });
    }

    const session = await addProcess(sessionId, workspaceId, {
      name: body.name,
      durationMinutes: body.durationMinutes,
      notes: body.notes || "",
      sequence: body.sequence ?? 0,
      dependsOn: body.dependsOn || null,
    });

    if (!session) {
      return NextResponse.json({ error: "Failed to add process" }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Add process error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
