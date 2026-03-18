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
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;
    if (body.defaultDurationMins !== undefined) updateData.default_duration_mins = body.defaultDurationMins;
    if (body.bookingType !== undefined) updateData.booking_type = body.bookingType;

    let { data, error } = await admin
      .from("service_types")
      .update(updateData)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    // Retry without default_duration_mins if column doesn't exist
    if (error && error.message?.includes("default_duration_mins")) {
      delete updateData.default_duration_mins;
      if (Object.keys(updateData).length > 0) {
        const retry = await admin.from("service_types").update(updateData).eq("id", id).eq("workspace_id", workspaceId).select("*").single();
        data = retry.data;
        error = retry.error;
      }
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
