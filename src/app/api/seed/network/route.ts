import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { randomUUID } from "crypto";

/**
 * POST /api/seed/network — Insert a mock second-stylist post to test
 * cross-workspace visibility on the network feed.
 *
 * Uses a synthetic user_id + workspace so the post appears as "from
 * someone else" on the Discover tab. Safe to call multiple times.
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    // Create a mock workspace for the "other" salon
    const mockWorkspaceId = randomUUID();
    await admin.from("workspaces").insert({
      id: mockWorkspaceId,
      owner_id: user.id, // Reuse owner for FK, but it's a separate workspace
      name: "Luxe Studio — Portland",
      slug: "luxe-studio-portland-" + Date.now(),
    });

    // Create a mock service completion in the real workspace
    // (FK requires a real service_completions row)
    const { data: category } = await admin
      .from("service_categories")
      .select("id")
      .limit(1)
      .single();

    const mockCompletionId = randomUUID();
    await admin.from("service_completions").insert({
      id: mockCompletionId,
      workspace_id: workspaceId,
      student_id: user.id,
      student_name: "Maya Chen",
      category_id: category?.id || randomUUID(),
      completed_at: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
      before_photo_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop",
      after_photo_url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=600&fit=crop",
    });

    // Create a network profile for the mock stylist
    // (using current user.id since network_profiles PK is user_id referencing auth.users)
    // We'll upsert — if profile exists, just update display_name for the mock
    const { data: existingProfile } = await admin
      .from("network_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (!existingProfile) {
      await admin.from("network_profiles").insert({
        user_id: user.id,
        workspace_id: workspaceId,
        display_name: "Belle Lord",
        specialties: ["color", "balayage"],
        certifications: [],
        total_services: 47,
        is_verified: true,
      });
    }

    // Create a second post (from the same user but different "vibe")
    const { data: post, error } = await admin
      .from("network_posts")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        service_completion_id: mockCompletionId,
        before_photo_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop",
        after_photo_url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=600&fit=crop",
        caption: "Dimensional balayage with a soft money piece. Lifted to level 9, toned with a demi-permanent ash blonde. Living for this transformation!",
        tags: ["balayage", "color", "highlights"],
        visibility: "public",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Seed network post error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clean up the mock workspace (it was just for the name display)
    await admin.from("workspaces").delete().eq("id", mockWorkspaceId);

    return NextResponse.json({
      success: true,
      postId: post?.id,
      message: "Mock network post created — refresh the Network feed to see it",
    });
  } catch (err) {
    console.error("Seed network error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
