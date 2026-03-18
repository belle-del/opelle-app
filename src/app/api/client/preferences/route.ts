import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getOrCreateCommsPreferences,
  updateCommsPreferences,
} from "@/lib/db/comms-preferences";

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
  try {
    const supabase = await createSupabaseServerClient();
    const clientUser = await getClientUser(supabase);
    if (!clientUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const preferences = await getOrCreateCommsPreferences(
      clientUser.workspace_id,
      clientUser.client_id
    );
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Failed to get preferences:", error);
    return NextResponse.json({ error: "Failed to get preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const clientUser = await getClientUser(supabase);
    if (!clientUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { emailEnabled, smsEnabled, quietHoursStart, quietHoursEnd } = body;

    await updateCommsPreferences(clientUser.workspace_id, clientUser.client_id, {
      emailEnabled,
      smsEnabled,
      quietHoursStart,
      quietHoursEnd,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
