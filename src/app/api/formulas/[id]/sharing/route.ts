import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { updateFormulaSharing } from "@/lib/db/formula-history";
import type { FormulaSharingLevel } from "@/lib/types";

const VALID_LEVELS: FormulaSharingLevel[] = ["private", "client_visible", "portable"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id } = await params;
    const { sharing_level } = await req.json();

    if (!sharing_level || !VALID_LEVELS.includes(sharing_level)) {
      return NextResponse.json(
        { error: "sharing_level must be private, client_visible, or portable" },
        { status: 400 }
      );
    }

    const updated = await updateFormulaSharing(id, sharing_level);
    if (!updated) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, formula: updated });
  } catch (err) {
    console.error("Formula sharing update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
