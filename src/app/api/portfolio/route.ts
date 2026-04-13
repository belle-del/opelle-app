import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    // Fetch service completions that have an after photo
    const { data: completions, error } = await supabase
      .from("service_completions")
      .select(`
        id,
        student_name,
        category_id,
        client_id,
        completed_at,
        before_photo_url,
        after_photo_url,
        notes,
        service_categories ( name )
      `)
      .eq("workspace_id", workspaceId)
      .not("after_photo_url", "is", null)
      .order("completed_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Portfolio fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
    }

    // Check which completions have been shared to the network
    const completionIds = (completions || []).map((c) => c.id);
    let sharedIds = new Set<string>();

    if (completionIds.length > 0) {
      const { data: posts } = await supabase
        .from("network_posts")
        .select("service_completion_id")
        .in("service_completion_id", completionIds);

      if (posts) {
        sharedIds = new Set(posts.map((p) => p.service_completion_id));
      }
    }

    const items = (completions || []).map((c) => ({
      id: c.id,
      studentName: c.student_name,
      categoryName: (c.service_categories as unknown as { name: string } | null)?.name || "Service",
      completedAt: c.completed_at,
      beforePhotoUrl: c.before_photo_url,
      afterPhotoUrl: c.after_photo_url,
      notes: c.notes,
      shared: sharedIds.has(c.id),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Portfolio error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
