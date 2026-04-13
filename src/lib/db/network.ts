import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import {
  type NetworkProfile,
  type NetworkProfileRow,
  type NetworkPost,
  type NetworkPostRow,
  type NetworkComment,
  type NetworkCommentRow,
  type StylistSpecialty,
  type PostVisibility,
  networkProfileRowToModel,
  networkPostRowToModel,
  networkCommentRowToModel,
} from "@/lib/types/network";

// ============================================================
// Profile
// ============================================================

export async function getNetworkProfile(
  userId: string
): Promise<NetworkProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("network_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return networkProfileRowToModel(data as NetworkProfileRow);
}

export async function getOrCreateNetworkProfile(
  userId: string
): Promise<NetworkProfile | null> {
  const existing = await getNetworkProfile(userId);
  if (existing) return existing;

  const workspaceId = await getWorkspaceId(userId);
  if (!workspaceId) return null;

  const admin = createSupabaseAdminClient();

  // Get workspace name for default display name
  const { data: workspace } = await admin
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const displayName =
    workspace?.name || userData?.user?.email?.split("@")[0] || "Stylist";

  const { data, error } = await admin
    .from("network_profiles")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      display_name: displayName,
      specialties: [],
      certifications: [],
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("network_profiles insert error:", error?.message);
    return null;
  }
  return networkProfileRowToModel(data as NetworkProfileRow);
}

export async function updateNetworkProfile(
  userId: string,
  updates: Record<string, unknown>
): Promise<NetworkProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("network_profiles")
    .update(updates)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("network_profiles update error:", error?.message);
    return null;
  }
  return networkProfileRowToModel(data as NetworkProfileRow);
}

// ============================================================
// Posts
// ============================================================

// PostgREST cannot resolve the implicit join between network_posts and
// network_profiles because both tables FK to auth.users — not to each other.
// We select only post columns, then enrich with profile/workspace data separately.
const POST_SELECT = "*";

async function enrichPostsWithProfiles(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  posts: Record<string, unknown>[]
): Promise<NetworkPostRow[]> {
  if (posts.length === 0) return [];

  const userIds = [...new Set(posts.map((p) => p.user_id as string))];
  const workspaceIds = [...new Set(posts.map((p) => p.workspace_id as string))];

  const [{ data: profiles }, { data: workspaces }] = await Promise.all([
    admin
      .from("network_profiles")
      .select("user_id, display_name, profile_photo_url, total_services")
      .in("user_id", userIds),
    admin
      .from("workspaces")
      .select("id, name")
      .in("id", workspaceIds),
  ]);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, p])
  );
  const workspaceMap = new Map(
    (workspaces || []).map((w) => [w.id, w])
  );

  return posts.map((post) => ({
    ...post,
    network_profiles: profileMap.get(post.user_id as string) || undefined,
    workspaces: workspaceMap.get(post.workspace_id as string) || undefined,
  })) as NetworkPostRow[];
}

export async function createNetworkPost(input: {
  serviceCompletionId: string;
  formulaHistoryId?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl: string;
  caption?: string;
  tags?: string[];
  visibility?: PostVisibility;
}): Promise<{ post: NetworkPost } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return { error: "No workspace found" };

  // Ensure user has a network profile
  await getOrCreateNetworkProfile(user.id);

  const admin = createSupabaseAdminClient();

  const insertPayload = {
    workspace_id: workspaceId,
    user_id: user.id,
    service_completion_id: input.serviceCompletionId,
    formula_history_id: input.formulaHistoryId || null,
    before_photo_url: input.beforePhotoUrl || null,
    after_photo_url: input.afterPhotoUrl,
    caption: input.caption || null,
    tags: input.tags || [],
    visibility: input.visibility || "public",
  };

  const { data, error } = await admin
    .from("network_posts")
    .insert(insertPayload)
    .select(POST_SELECT)
    .single();

  if (error || !data) {
    const errMsg = `${error?.message || "Unknown error"} (code: ${error?.code}, hint: ${error?.hint || "none"})`;
    console.error("network_posts insert error:", errMsg);
    return { error: errMsg };
  }

  const [enriched] = await enrichPostsWithProfiles(admin, [data]);
  return { post: networkPostRowToModel(enriched) };
}

export async function getNetworkPost(
  postId: string
): Promise<NetworkPost | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("network_posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .single();

  if (error || !data) return null;
  const [enriched] = await enrichPostsWithProfiles(admin, [data]);
  return networkPostRowToModel(enriched);
}

export async function getDiscoverFeed(options: {
  cursor?: string;
  limit?: number;
}): Promise<NetworkPost[]> {
  const admin = createSupabaseAdminClient();
  const limit = options.limit || 20;

  let query = admin
    .from("network_posts")
    .select(POST_SELECT)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  const enriched = await enrichPostsWithProfiles(admin, data);
  return enriched.map(networkPostRowToModel);
}

export async function getFollowingFeed(
  userId: string,
  options: { cursor?: string; limit?: number }
): Promise<NetworkPost[]> {
  const admin = createSupabaseAdminClient();
  const limit = options.limit || 20;

  // Get followed user IDs
  const { data: follows } = await admin
    .from("network_follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (!follows || follows.length === 0) return [];

  const followingIds = follows.map((f) => f.following_id);

  let query = admin
    .from("network_posts")
    .select(POST_SELECT)
    .in("user_id", followingIds)
    .in("visibility", ["public", "network", "followers"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  const enriched = await enrichPostsWithProfiles(admin, data);
  return enriched.map(networkPostRowToModel);
}

export async function getUserPosts(
  userId: string,
  options: { cursor?: string; limit?: number }
): Promise<NetworkPost[]> {
  const admin = createSupabaseAdminClient();
  const limit = options.limit || 20;

  let query = admin
    .from("network_posts")
    .select(POST_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  const enriched = await enrichPostsWithProfiles(admin, data);
  return enriched.map(networkPostRowToModel);
}

export async function deleteNetworkPost(
  postId: string,
  userId: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("network_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);

  return !error;
}

// ============================================================
// Engagement
// ============================================================

export async function toggleLike(
  userId: string,
  postId: string
): Promise<{ liked: boolean }> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("network_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .single();

  if (existing) {
    await admin
      .from("network_likes")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    return { liked: false };
  }

  await admin
    .from("network_likes")
    .insert({ user_id: userId, post_id: postId });
  return { liked: true };
}

export async function toggleSave(
  userId: string,
  postId: string
): Promise<{ saved: boolean }> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("network_saves")
    .select("user_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .single();

  if (existing) {
    await admin
      .from("network_saves")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    return { saved: false };
  }

  await admin
    .from("network_saves")
    .insert({ user_id: userId, post_id: postId });
  return { saved: true };
}

export async function getUserLikedPostIds(
  userId: string,
  postIds: string[]
): Promise<string[]> {
  if (postIds.length === 0) return [];
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("network_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  return data?.map((d) => d.post_id) ?? [];
}

export async function getUserSavedPostIds(
  userId: string,
  postIds: string[]
): Promise<string[]> {
  if (postIds.length === 0) return [];
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("network_saves")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  return data?.map((d) => d.post_id) ?? [];
}

// ============================================================
// Comments
// ============================================================

const COMMENT_SELECT_WITH_JOINS =
  "*, network_profiles(display_name, profile_photo_url)";

export async function getComments(
  postId: string
): Promise<NetworkComment[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("network_comments")
    .select(COMMENT_SELECT_WITH_JOINS)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as NetworkCommentRow[]).map(networkCommentRowToModel);
}

export async function addComment(input: {
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
}): Promise<NetworkComment | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("network_comments")
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      content: input.content,
      parent_comment_id: input.parentCommentId || null,
    })
    .select(COMMENT_SELECT_WITH_JOINS)
    .single();

  if (error || !data) {
    console.error("network_comments insert error:", error?.message);
    return null;
  }
  return networkCommentRowToModel(data as NetworkCommentRow);
}

export async function deleteComment(
  commentId: string,
  userId: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("network_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  return !error;
}

// ============================================================
// Follows
// ============================================================

export async function toggleFollow(
  followerId: string,
  followingId: string
): Promise<{ following: boolean }> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("network_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();

  if (existing) {
    await admin
      .from("network_follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    return { following: false };
  }

  await admin
    .from("network_follows")
    .insert({ follower_id: followerId, following_id: followingId });
  return { following: true };
}

export async function getFollowerCount(userId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("network_follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("network_follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  return count ?? 0;
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("network_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();

  return !!data;
}

// ============================================================
// Search
// ============================================================

export async function searchStylists(query: {
  term?: string;
  specialty?: string;
  location?: string;
  limit?: number;
}): Promise<NetworkProfile[]> {
  const admin = createSupabaseAdminClient();
  const limit = query.limit || 20;

  let q = admin
    .from("network_profiles")
    .select("*")
    .eq("portfolio_visible", true)
    .order("total_services", { ascending: false })
    .limit(limit);

  if (query.term) {
    q = q.or(
      `display_name.ilike.%${query.term}%,bio.ilike.%${query.term}%`
    );
  }

  if (query.specialty) {
    q = q.contains("specialties", [query.specialty]);
  }

  if (query.location) {
    q = q.ilike("location", `%${query.location}%`);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as NetworkProfileRow[]).map(networkProfileRowToModel);
}

// ============================================================
// Specialties
// ============================================================

export async function getSpecialties(): Promise<StylistSpecialty[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("stylist_specialties")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    icon: row.icon ?? undefined,
    sortOrder: row.sort_order,
  }));
}
