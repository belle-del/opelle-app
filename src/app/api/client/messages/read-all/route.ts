import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: clientUser } = await supabase
    .from("client_users")
    .select("client_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!clientUser) {
    return NextResponse.json({ error: "Not a client user" }, { status: 403 });
  }

  await supabase
    .from("client_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientUser.client_id)
    .is("read_at", null);

  return NextResponse.redirect(new URL("/client/messages", process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000"));
}
