import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getClientUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clientUser } = await supabase
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return clientUser;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const clientUser = await getClientUser(supabase);
  if (!clientUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: notifications } = await supabase
    .from("client_notifications")
    .select("*")
    .eq("client_id", clientUser.client_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ notifications: notifications || [] });
}
