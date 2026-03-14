import { NextResponse } from "next/server";
import { regenerateStylistCode } from "@/lib/db/workspaces";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { workspaceId } = await request.json();

  // Verify ownership
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", user.id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const newCode = await regenerateStylistCode(workspaceId);
    return NextResponse.json({ code: newCode });
  } catch {
    return NextResponse.json({ error: "Failed to regenerate code" }, { status: 500 });
  }
}
