import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const admin = createSupabaseAdminClient();
    const uploadedUrls: string[] = [];

    // Process each photo file from formData
    let index = 0;
    while (formData.has(`photo${index}`)) {
      const file = formData.get(`photo${index}`) as File;
      if (!file || !(file instanceof File)) break;

      const ext = file.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const path = `${user.id}/${timestamp}_${index}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await admin.storage.from("calla-techniques").upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

      if (error) {
        console.error("[calla-upload] Storage error:", error.message);
        // Try creating bucket if it doesn't exist
        if (error.message?.includes("not found") || error.message?.includes("Bucket")) {
          await admin.storage.createBucket("calla-techniques", { public: true });
          // Retry upload
          const { error: retryError } = await admin.storage.from("calla-techniques").upload(path, buffer, {
            contentType: file.type,
            upsert: true,
          });
          if (retryError) {
            console.error("[calla-upload] Retry failed:", retryError.message);
            index++;
            continue;
          }
        } else {
          index++;
          continue;
        }
      }

      const { data: publicUrlData } = admin.storage
        .from("calla-techniques")
        .getPublicUrl(path);

      uploadedUrls.push(publicUrlData.publicUrl);
      index++;
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (err) {
    console.error("Calla upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
