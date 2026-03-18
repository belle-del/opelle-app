import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServiceType, BookingType } from "@/lib/types";

// Helper: get workspace for authenticated user using admin client for DB queries
async function getWorkspaceForUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (!user) {
    console.error("[service-types] Auth failed:", authErr?.message || "no user in cookies");
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data: workspace, error: wsErr } = await admin
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (wsErr || !workspace) {
    // Maybe user is a workspace member, not owner
    const { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (membership) {
      const { data: ws } = await admin
        .from("workspaces")
        .select("*")
        .eq("id", membership.workspace_id)
        .single();
      return ws;
    }

    console.error("[service-types] No workspace for user:", user.id, wsErr?.message);
    return null;
  }

  return workspace;
}

export async function GET() {
  try {
    const workspace = await getWorkspaceForUser();
    if (!workspace) {
      return NextResponse.json([], { status: 200 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("service_types")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[service-types GET] Error:", error.message);
      return NextResponse.json([], { status: 200 });
    }

    const types: ServiceType[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      workspaceId: row.workspace_id as string,
      name: row.name as string,
      sortOrder: (row.sort_order as number) || 0,
      defaultDurationMins: (row.default_duration_mins as number) ?? undefined,
      bookingType: (row.booking_type as BookingType) ?? undefined,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json(types);
  } catch (error) {
    console.error("[service-types GET] Error:", error);
    return NextResponse.json({ error: "Failed to list service types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const workspace = await getWorkspaceForUser();
    if (!workspace) {
      return NextResponse.json({ error: "Not authenticated — please refresh the page and try again" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Get next sort order
    const { data: maxRow } = await admin
      .from("service_types")
      .select("sort_order")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    const sortOrder = ((maxRow?.sort_order as number) ?? -1) + 1;

    // Build insert data — only include columns that exist
    const insertData: Record<string, unknown> = {
      workspace_id: workspace.id,
      name: body.name.trim(),
      sort_order: sortOrder,
    };

    // Try with default_duration_mins first
    if (body.defaultDurationMins !== undefined) {
      insertData.default_duration_mins = body.defaultDurationMins;
    }

    let { data, error } = await admin
      .from("service_types")
      .insert(insertData)
      .select("*")
      .single();

    // Retry without default_duration_mins if column doesn't exist
    if (error && error.message?.includes("default_duration_mins")) {
      console.warn("[service-types POST] default_duration_mins column missing, retrying");
      delete insertData.default_duration_mins;
      const retry = await admin.from("service_types").insert(insertData).select("*").single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      console.error("[service-types POST] Insert failed:", error?.message);
      return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });
    }

    const created: ServiceType = {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      sortOrder: data.sort_order || 0,
      defaultDurationMins: data.default_duration_mins ?? undefined,
      bookingType: data.booking_type ?? undefined,
      createdAt: data.created_at,
    };

    return NextResponse.json(created);
  } catch (error) {
    console.error("[service-types POST] Error:", error);
    return NextResponse.json({ error: "Failed to create service type" }, { status: 500 });
  }
}
