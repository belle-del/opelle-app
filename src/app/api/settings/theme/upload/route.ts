import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();

    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (ws?.owner_id !== user.id) {
      return NextResponse.json({ error: "Only workspace owner can upload assets" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetType = formData.get("asset_type") as string;

    if (!file || !assetType) {
      return NextResponse.json({ error: "file and asset_type required" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const storagePath = `${workspaceId}/${assetType}.${ext}`;

    await admin.storage.createBucket("theme-assets", { public: true }).catch(() => {});

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("theme-assets")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("theme-assets").getPublicUrl(storagePath);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("Theme upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
