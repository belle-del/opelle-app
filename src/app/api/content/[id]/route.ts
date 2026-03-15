import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { getContentPost, updateContentPost } from "@/lib/db/content";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const post = await getContentPost(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Failed to get content post:", error);
    return NextResponse.json({ error: "Failed to get content post" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, body: postBody, category } = body;

    await updateContentPost(id, { title, body: postBody, category });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update content post:", error);
    return NextResponse.json({ error: "Failed to update content post" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("content_posts")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspace.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete content post" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete content post:", error);
    return NextResponse.json({ error: "Failed to delete content post" }, { status: 500 });
  }
}
