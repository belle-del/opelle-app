import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublishedContent } from "@/lib/db/content";

async function getClientUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clientUser } = await supabase
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return clientUser;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const clientUser = await getClientUser(supabase);
    if (!clientUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const posts = await getPublishedContent(clientUser.workspace_id);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to list published content:", error);
    return NextResponse.json({ error: "Failed to list published content" }, { status: 500 });
  }
}
