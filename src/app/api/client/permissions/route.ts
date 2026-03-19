import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CLIENT_PERMISSIONS } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: clientUser } = await admin
      .from("client_users")
      .select("client_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!clientUser) {
      return NextResponse.json({ error: "No client account" }, { status: 404 });
    }

    const { data: client } = await admin
      .from("clients")
      .select("permissions")
      .eq("id", clientUser.client_id)
      .single();

    const permissions = client?.permissions || DEFAULT_CLIENT_PERMISSIONS;
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
