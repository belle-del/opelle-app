import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import type { PhotoPair } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id: clientId } = await params;

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("service_completions")
      .select(`
        id,
        before_photo_url,
        after_photo_url,
        completed_at,
        student_name,
        notes,
        service_categories ( name )
      `)
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .or("before_photo_url.not.is.null,after_photo_url.not.is.null")
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("[clients/photos] query error:", error.message);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pairs: PhotoPair[] = (data ?? []).map((row: any) => ({
      id: row.id,
      beforePhotoUrl: row.before_photo_url,
      afterPhotoUrl: row.after_photo_url,
      completedAt: row.completed_at,
      categoryName: Array.isArray(row.service_categories)
        ? (row.service_categories[0]?.name ?? "Service")
        : (row.service_categories?.name ?? "Service"),
      studentName: row.student_name ?? undefined,
      notes: row.notes ?? undefined,
    }));

    return NextResponse.json({ pairs });
  } catch (err) {
    console.error("[clients/photos] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
