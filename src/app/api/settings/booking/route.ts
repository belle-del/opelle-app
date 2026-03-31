import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const { workspaceId, bookingWindowDays, bufferMinutes, workingHours, allowIndividualAvailability } = await request.json();

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

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
