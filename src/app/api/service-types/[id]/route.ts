import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const workspaceId = body.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Separate duration update from other fields (column may not exist in prod)
    const hasDuration = body.defaultDurationMins !== undefined;
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;
    if (body.bookingType !== undefined) updateData.booking_type = body.bookingType;

    // Update core fields first
    let data: Record<string, unknown> | null = null;
    let error: { message: string } | null = null;

    if (Object.keys(updateData).length > 0) {
      const result = await admin
        .from("service_types")
        .update(updateData)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select("*")
        .single();
      data = result.data as Record<string, unknown> | null;
      error = result.error;
    }

    // Try updating duration separately (may fail if column doesn't exist)
    if (hasDuration && !error) {
      const { data: updated, error: durErr } = await admin
        .from("service_types")
        .update({ default_duration_mins: body.defaultDurationMins })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select("*")
        .single();
      if (!durErr && updated) {
        data = updated as Record<string, unknown>;
      }
      // If only duration was being updated and core update was skipped
      if (!data && !durErr && updated) {
        data = updated as Record<string, unknown>;
      }
    }

    // If we only had duration to update and it failed, fetch current data
    if (!data && !error && Object.keys(updateData).length === 0) {
      const { data: current } = await admin
        .from("service_types")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .single();
      data = current as Record<string, unknown> | null;
    }

    if (error || !data) {
      console.error("[service-types PATCH] Error:", error?.message);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[service-types PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("service_types")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("[service-types DELETE] Error:", error.message);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[service-types DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
