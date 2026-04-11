import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getNetworkPost,
  getComments,
  getUserLikedPostIds,
  getUserSavedPostIds,
  deleteNetworkPost,
} from "@/lib/db/network";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const post = await getNetworkPost(id);
    if (!post)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const [comments, likedIds, savedIds] = await Promise.all([
      getComments(id),
      getUserLikedPostIds(user.id, [id]),
      getUserSavedPostIds(user.id, [id]),
    ]);

    return NextResponse.json({
      post: {
        ...post,
        liked: likedIds.includes(id),
        saved: savedIds.includes(id),
      },
      comments,
    });
  } catch (err) {
    console.error("Get network post error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const success = await deleteNetworkPost(id, user.id);
    if (!success)
      return NextResponse.json(
        { error: "Failed to delete post" },
        { status: 500 }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete network post error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
