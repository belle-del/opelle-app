import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createNetworkPost } from "@/lib/db/network";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      serviceCompletionId,
      formulaHistoryId,
      beforePhotoUrl,
      afterPhotoUrl,
      caption,
      tags,
      visibility,
    } = body;

    if (!serviceCompletionId) {
      return NextResponse.json(
        {
          error:
            "serviceCompletionId is required — posts must link to real work",
        },
        { status: 400 }
      );
    }
    if (!afterPhotoUrl) {
      return NextResponse.json(
        { error: "afterPhotoUrl is required" },
        { status: 400 }
      );
    }

    // Validate that the service completion exists and belongs to this workspace
    const workspaceId = await getWorkspaceId(user.id);
    if (workspaceId) {
      const admin = createSupabaseAdminClient();
      const { data: completion, error: lookupErr } = await admin
        .from("service_completions")
        .select("id")
        .eq("id", serviceCompletionId)
        .eq("workspace_id", workspaceId)
        .single();

      if (lookupErr || !completion) {
        console.error("Service completion lookup failed:", lookupErr?.message, "completionId:", serviceCompletionId, "workspaceId:", workspaceId);
        return NextResponse.json(
          { error: `Service completion not found (id: ${serviceCompletionId})` },
          { status: 400 }
        );
      }
    }

    const post = await createNetworkPost({
      serviceCompletionId,
      formulaHistoryId,
      beforePhotoUrl,
      afterPhotoUrl,
      caption,
      tags,
      visibility,
    });

    if (!post) {
      return NextResponse.json(
        { error: "Failed to create post — check server logs for details" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post });
  } catch (err) {
    console.error("Create network post error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
