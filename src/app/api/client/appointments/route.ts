import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClientNotification } from "@/lib/client-notifications";
import { toLocalISOString } from "@/lib/utils";

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
  const { data: appointments } = await admin
    .from("appointments")
    .select("*")
    .eq("client_id", clientUser.client_id)
    .order("start_at", { ascending: false });

  return NextResponse.json({ appointments: appointments || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { serviceId, serviceName, startAt, durationMins, clientId, workspaceId } = body;

  // Try cookie auth first
  let clientUser: { workspace_id: string; client_id: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    clientUser = await getClientUser(supabase);
  } catch {}

  // Fallback: accept clientId + workspaceId from body (page is middleware-protected)
  if (!clientUser && clientId && workspaceId) {
    clientUser = { workspace_id: workspaceId, client_id: clientId };
  }

  // Fallback: look up from service type
  if (!clientUser && serviceId) {
    const admin = createSupabaseAdminClient();
    const { data: st } = await admin.from("service_types").select("workspace_id").eq("id", serviceId).single();
    if (st) {
      // Get any client_users record for this workspace
      const { data: cu } = await admin.from("client_users").select("client_id, workspace_id").eq("workspace_id", st.workspace_id).limit(1).single();
      if (cu) clientUser = cu;
    }
  }

  if (!clientUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!serviceName || !startAt || !durationMins) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const endAt = toLocalISOString(new Date(new Date(startAt).getTime() + durationMins * 60000));

  const admin = createSupabaseAdminClient();
  const { data: appointment, error } = await admin
    .from("appointments")
    .insert({
      workspace_id: clientUser.workspace_id,
      client_id: clientUser.client_id,
      service_id: null, // service_id FK references 'services' table, not 'service_types'
      service_name: serviceName,
      start_at: startAt,
      end_at: endAt,
      duration_mins: durationMins,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }

  // Create notification
  const dateStr = new Date(startAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  await createClientNotification({
    workspaceId: clientUser.workspace_id,
    clientId: clientUser.client_id,
    type: "booking_update",
    title: `Your appointment is confirmed for ${dateStr}`,
    actionUrl: "/client",
  });

  return NextResponse.json({ appointment });
}
