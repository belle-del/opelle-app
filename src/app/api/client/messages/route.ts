import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function getClientUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseAdminClient();
  const { data: clientUser } = await admin
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

  const admin = createSupabaseAdminClient();
  const { data: notifications } = await admin
    .from("client_notifications")
    .select("*")
    .eq("client_id", clientUser.client_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ notifications: notifications || [] });
}
