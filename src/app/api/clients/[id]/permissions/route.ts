import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClientPermissions } from "@/lib/types";
import { DEFAULT_CLIENT_PERMISSIONS } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as Partial<ClientPermissions>;

    const admin = createSupabaseAdminClient();

    // Get current permissions
    const { data: client } = await admin
      .from("clients")
      .select("permissions")
      .eq("id", id)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const current = (client.permissions as ClientPermissions) || DEFAULT_CLIENT_PERMISSIONS;
    const updated: ClientPermissions = { ...current, ...body };

    const { error } = await admin
      .from("clients")
      .update({ permissions: updated })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ permissions: updated });
  } catch (error) {
    console.error("Failed to update permissions:", error);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}
