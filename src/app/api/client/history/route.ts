import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClientUserRow } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: clientUser } = await admin
      .from("client_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (!clientUser) return NextResponse.json({ error: "No client record" }, { status: 403 });
    const cu = clientUser as ClientUserRow;

    // Fetch appointments with service info
    const { data: appointments } = await admin
      .from("appointments")
      .select("id, service_name, start_at, end_at, duration_mins, status, notes")
      .eq("workspace_id", cu.workspace_id)
      .eq("client_id", cu.client_id)
      .order("start_at", { ascending: false })
      .limit(100);

    // Fetch service completions with photos for this client
    const { data: completions } = await admin
      .from("service_completions")
      .select("id, category_id, completed_at, before_photo_url, after_photo_url, notes")
      .eq("workspace_id", cu.workspace_id)
      .eq("client_id", cu.client_id)
      .order("completed_at", { ascending: false });

    // Fetch photos from the photos table for this client
    const { data: photos } = await admin
      .from("photos")
      .select("id, url, photo_type, appointment_id, caption, created_at")
      .eq("workspace_id", cu.workspace_id)
      .eq("client_id", cu.client_id)
      .in("photo_type", ["before", "after"])
      .order("created_at", { ascending: false });

    // Build a map of appointment_id → photos
    const photosByAppointment: Record<string, Array<{ url: string; photo_type: string }>> = {};
    for (const photo of photos || []) {
      if (!photo.appointment_id) continue;
      if (!photosByAppointment[photo.appointment_id]) {
        photosByAppointment[photo.appointment_id] = [];
      }
      photosByAppointment[photo.appointment_id].push({
        url: photo.url,
        photo_type: photo.photo_type,
      });
    }

    // Enrich appointments with photos from both sources
    const enriched = (appointments || []).map((appt) => {
      // Check service_completions for photos
      const completion = (completions || []).find(
        (c) => c.completed_at && appt.status === "completed"
      );
      const completionPhotos = completion
        ? {
            before_photo_url: completion.before_photo_url,
            after_photo_url: completion.after_photo_url,
          }
        : null;

      return {
        ...appt,
        photos: photosByAppointment[appt.id] || [],
        completion_photos: completionPhotos,
      };
    });

    return NextResponse.json({ visits: enriched });
  } catch (err) {
    console.error("Client history error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
