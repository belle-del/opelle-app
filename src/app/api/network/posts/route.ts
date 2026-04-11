import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNetworkPost } from "@/lib/db/network";

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
        { error: "Failed to create post" },
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
