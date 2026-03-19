import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAftercarePlansForClient } from "@/lib/db/aftercare";

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

    const plans = await getAftercarePlansForClient(clientUser.client_id);
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Failed to fetch aftercare:", error);
    return NextResponse.json(
      { error: "Failed to fetch aftercare" },
      { status: 500 }
    );
  }
}
