import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/db/workspaces";
import { getAllContent, createContentPost } from "@/lib/db/content";
import { dispatchComms } from "@/lib/kernel";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const posts = await getAllContent(workspace.id);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to list content:", error);
    return NextResponse.json({ error: "Failed to list content" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { title, body: postBody, category, publish } = body;

    if (!title || !postBody || !category) {
      return NextResponse.json(
        { error: "Title, body, and category are required" },
        { status: 400 }
      );
    }

    const post = await createContentPost({
      workspaceId: workspace.id,
      title,
      body: postBody,
      category,
      publish,
    });

    // If publishing, dispatch comms event to all clients in workspace
    if (publish) {
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
              context: { title },
            })
          )
        );
      }
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Failed to create content:", error);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
}
