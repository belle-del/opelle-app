import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { workspaceId, bookingWindowDays, bufferMinutes, workingHours } = await request.json();

  // Verify ownership
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", user.id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (bookingWindowDays !== undefined) updates.booking_window_days = bookingWindowDays;
  if (bufferMinutes !== undefined) updates.buffer_minutes = bufferMinutes;
  if (workingHours !== undefined) updates.working_hours = workingHours;

  const { error } = await supabase
    .from("workspaces")
    .update(updates)
    .eq("id", workspaceId);

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
