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
  const { data: client } = await admin
    .from("clients")
    .select("*")
    .eq("id", clientUser.client_id)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const clientUser = await getClientUser(supabase);
  if (!clientUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = ["first_name", "last_name", "pronouns", "phone", "preference_profile"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: client, error } = await admin
    .from("clients")
    .update(updates)
    .eq("id", clientUser.client_id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ client });
}
