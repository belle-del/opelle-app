import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getContentPost } from "@/lib/db/content";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const clientUser = await getClientUser(supabase);
    if (!clientUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const post = await getContentPost(id);

    if (!post || !post.publishedAt) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Failed to get content post:", error);
    return NextResponse.json({ error: "Failed to get content post" }, { status: 500 });
  }
}
