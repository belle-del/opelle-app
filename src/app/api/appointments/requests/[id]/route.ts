import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const validStatuses = ["pending", "confirmed", "declined", "acknowledged"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("rebook_requests")
      .update({ status: body.status })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[requests/PATCH] Error:", error.message);
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[requests/PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
