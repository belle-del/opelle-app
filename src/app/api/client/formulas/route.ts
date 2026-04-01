import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getVisibleFormulasForClient } from "@/lib/db/formula-history";
import type { ClientUserRow } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: clientUser } = await admin
      .from("client_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (!clientUser) return NextResponse.json({ error: "No client record" }, { status: 403 });
    const cu = clientUser as ClientUserRow;

    // Only returns formulas where sharing_level is 'client_visible' or 'portable'
    const formulas = await getVisibleFormulasForClient(cu.client_id, cu.workspace_id);

    return NextResponse.json({ formulas });
  } catch (err) {
    console.error("Client formulas error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
