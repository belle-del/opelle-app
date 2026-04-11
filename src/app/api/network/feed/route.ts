import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getDiscoverFeed,
  getFollowingFeed,
  getUserLikedPostIds,
  getUserSavedPostIds,
} from "@/lib/db/network";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "discover";
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const posts =
      tab === "following"
        ? await getFollowingFeed(user.id, { cursor, limit })
        : await getDiscoverFeed({ cursor, limit });

    const postIds = posts.map((p) => p.id);
    const [likedIds, savedIds] = await Promise.all([
      getUserLikedPostIds(user.id, postIds),
      getUserSavedPostIds(user.id, postIds),
    ]);

    const enrichedPosts = posts.map((post) => ({
      ...post,
      liked: likedIds.includes(post.id),
      saved: savedIds.includes(post.id),
    }));

    const nextCursor =
      posts.length >= limit ? posts[posts.length - 1].createdAt : null;

    return NextResponse.json({ posts: enrichedPosts, nextCursor });
  } catch (err) {
    console.error("Network feed error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
