import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

// GET: List all conversations for the authenticated user
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const { data: conversations, error } = await admin
    .from("mentis_conversations")
    .select("id, title, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: conversations || [] });
}

// POST: Create a new conversation
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const workspaceId2 = await getWorkspaceId(user.id);
  if (!workspaceId2) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();
  const title = body.title?.trim() || "New conversation";

  const { data: conversation, error } = await admin
    .from("mentis_conversations")
    .insert({
      workspace_id: workspaceId2,
      user_id: user.id,
      title,
    })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation });
}
