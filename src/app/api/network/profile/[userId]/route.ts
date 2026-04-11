import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getNetworkProfile,
  getUserPosts,
  getFollowerCount,
  getFollowingCount,
  isFollowing,
} from "@/lib/db/network";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getNetworkProfile(userId);
    if (!profile || !profile.portfolioVisible) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;

    const [posts, followers, following, userIsFollowing] = await Promise.all([
      getUserPosts(userId, { cursor, limit: 20 }),
      getFollowerCount(userId),
      getFollowingCount(userId),
      isFollowing(user.id, userId),
    ]);

    return NextResponse.json({
      profile,
      posts,
      followers,
      following,
      isFollowing: userIsFollowing,
    });
  } catch (err) {
    console.error("Get public profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
