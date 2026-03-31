import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace found" }, { status: 404 });

  const body = await request.json();
  const { bookingWindowDays, bufferMinutes, workingHours, allowIndividualAvailability } = body;

  const admin = createSupabaseAdminClient();

  const updates: Record<string, unknown> = {};
  if (bookingWindowDays !== undefined) updates.booking_window_days = bookingWindowDays;
  if (bufferMinutes !== undefined) updates.buffer_minutes = bufferMinutes;
  if (workingHours !== undefined) updates.working_hours = workingHours;
  if (allowIndividualAvailability !== undefined) updates.allow_individual_availability = allowIndividualAvailability;

  const { error } = await admin
    .from("workspaces")
    .update(updates)
    .eq("id", workspaceId);

  if (error) {
    console.error("[settings/booking] Failed to update:", error.message);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
