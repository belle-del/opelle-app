import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
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
    return NextResponse.json({ error: "Not a client user" }, { status: 403 });
  }

  await admin
    .from("client_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientUser.client_id)
    .is("read_at", null);

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/client/messages", origin));
}
