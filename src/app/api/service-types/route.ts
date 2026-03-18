import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServiceType, BookingType } from "@/lib/types";

function mapRow(row: Record<string, unknown>): ServiceType {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    sortOrder: (row.sort_order as number) || 0,
    defaultDurationMins: (row.default_duration_mins as number) ?? undefined,
    bookingType: (row.booking_type as BookingType) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json([], { status: 200 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("service_types")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[service-types GET] Error:", error.message);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json((data || []).map(mapRow));
  } catch (error) {
    console.error("[service-types GET] Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Get next sort order
    const { data: maxRow } = await admin
      .from("service_types")
      .select("sort_order")
      .eq("workspace_id", body.workspaceId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    const sortOrder = ((maxRow?.sort_order as number) ?? -1) + 1;

    // Insert without default_duration_mins first (column may not exist in prod)
    const insertData: Record<string, unknown> = {
      workspace_id: body.workspaceId,
      name: body.name.trim(),
      sort_order: sortOrder,
    };

    let { data, error } = await admin
      .from("service_types")
      .insert(insertData)
      .select("*")
      .single();

    // If that succeeded and we have a duration to set, try updating it separately
    if (!error && data && body.defaultDurationMins !== undefined) {
      const { data: updated, error: updateErr } = await admin
        .from("service_types")
        .update({ default_duration_mins: body.defaultDurationMins })
        .eq("id", (data as Record<string, unknown>).id)
        .select("*")
        .single();
      // If update fails (column doesn't exist), just keep the original data
      if (!updateErr && updated) {
        data = updated;
      }
    }

    if (error || !data) {
      console.error("[service-types POST] Insert failed:", error?.message);
      return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });
    }

    return NextResponse.json(mapRow(data));
  } catch (error) {
    console.error("[service-types POST] Error:", error);
    return NextResponse.json({ error: "Failed to create service type" }, { status: 500 });
  }
}
