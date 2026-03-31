import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import {
  listAvailabilityOverrides,
  upsertAvailabilityOverride,
  deleteAvailabilityOverride,
} from "@/lib/db/availability";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const overrides = await listAvailabilityOverrides(workspaceId, userId, from, to);
    return NextResponse.json({ overrides });
  } catch (err) {
    console.error("[booking/availability/overrides GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const body = await request.json();
    const { userId, overrideDate, isAvailable, startTime, endTime, notes } = body;

    if (!userId || !overrideDate || isAvailable === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If available, must have times
    if (isAvailable && (!startTime || !endTime)) {
      return NextResponse.json(
        { error: "startTime and endTime required when isAvailable is true" },
        { status: 400 }
      );
    }

    const override = await upsertAvailabilityOverride({
      workspace_id: workspaceId,
      user_id: userId,
      override_date: overrideDate,
      is_available: isAvailable,
      start_time: isAvailable ? startTime : null,
      end_time: isAvailable ? endTime : null,
      notes: notes ?? null,
    });

    return NextResponse.json({ override }, { status: 201 });
  } catch (err) {
    console.error("[booking/availability/overrides POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const deleted = await deleteAvailabilityOverride(id, workspaceId);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[booking/availability/overrides DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
