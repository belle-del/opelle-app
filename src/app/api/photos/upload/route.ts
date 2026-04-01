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

    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    const photoType = formData.get("photo_type") as string | null;
    const clientId = formData.get("client_id") as string | null;
    const appointmentId = formData.get("appointment_id") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "photo file required" }, { status: 400 });
    }
    if (!photoType || !["before", "after", "progress", "other"].includes(photoType)) {
      return NextResponse.json({ error: "photo_type must be before, after, progress, or other" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const storagePath = `${workspaceId}/${clientId || "general"}/${photoType}_${timestamp}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("service-photos")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Photo upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
    }

    const { data: urlData } = admin.storage
      .from("service-photos")
      .getPublicUrl(storagePath);

    const photoUrl = urlData.publicUrl;

    // Insert into photos table
    const { data: photoRecord, error: insertError } = await admin
      .from("photos")
      .insert({
        workspace_id: workspaceId,
        client_id: clientId || null,
        appointment_id: appointmentId || null,
        url: photoUrl,
        caption: caption || null,
        photo_type: photoType,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Photo record insert error:", insertError);
      return NextResponse.json({ error: "Failed to save photo record" }, { status: 500 });
    }

    return NextResponse.json({
      photoId: photoRecord.id,
      url: photoUrl,
    });
  } catch (err) {
    console.error("Photo upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
