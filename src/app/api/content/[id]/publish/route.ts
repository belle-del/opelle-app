import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { publishContentPost, getContentPost } from "@/lib/db/content";
import { dispatchComms } from "@/lib/kernel";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    // Get the post to retrieve title for comms dispatch
    const post = await getContentPost(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await publishContentPost(id);

    // Dispatch comms event to all clients in workspace
    const admin = createSupabaseAdminClient();
    const { data: clients } = await admin
      .from("clients")
      .select("id")
      .eq("workspace_id", workspace.id);

    if (clients && clients.length > 0) {
      await Promise.all(
        clients.map((c) =>
          dispatchComms({
            event: "content.published",
            workspace_id: workspace.id,
            client_id: c.id,
            context: { title: post.title },
          })
        )
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to publish content post:", error);
    return NextResponse.json({ error: "Failed to publish content post" }, { status: 500 });
  }
}
