import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { metisSuggestions } from "@/lib/kernel";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const { page, entityType, entityData } = await req.json();

  const result = await metisSuggestions({ page, entityType, entityData });
  if (!result) {
    return NextResponse.json({ suggestions: [] });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
