import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PhotoPair } from "@/lib/types";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const admin = createSupabaseAdminClient();

    // Resolve workspace for this userId (they must be the owner)
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id, name, portfolio_public, owner_id")
      .eq("owner_id", userId)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check auth — authenticated owner can always see; others need portfolio_public
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user?.id === workspace.owner_id;

    if (!workspace.portfolio_public && !isOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch stylist display name from user metadata
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const stylistName = authUser?.user?.user_metadata?.full_name
      || authUser?.user?.email?.split("@")[0]
      || "Stylist";

    // Query photos
    const { data, error } = await admin
      .from("service_completions")
      .select(`
        id,
        before_photo_url,
        after_photo_url,
        completed_at,
        notes,
        service_categories ( name )
      `)
      .eq("workspace_id", workspace.id)
      .or("before_photo_url.not.is.null,after_photo_url.not.is.null")
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("[portfolio] query error:", error.message);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const pairs: PhotoPair[] = (data ?? []).map((row: {
      id: string;
      before_photo_url: string | null;
      after_photo_url: string | null;
      completed_at: string;
      notes: string | null;
      service_categories: { name: string } | { name: string }[] | null;
    }) => ({
      id: row.id,
      beforePhotoUrl: row.before_photo_url,
      afterPhotoUrl: row.after_photo_url,
      completedAt: row.completed_at,
      categoryName: Array.isArray(row.service_categories)
        ? (row.service_categories[0]?.name ?? "Service")
        : (row.service_categories?.name ?? "Service"),
      // No studentName or notes on public portfolio
    }));

    return NextResponse.json({
      pairs,
      stylistName,
      workspaceName: workspace.name,
      portfolioPublic: workspace.portfolio_public,
    });
  } catch (err) {
    console.error("[portfolio] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
