import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClientNotification } from "@/lib/client-notifications";

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

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("client_id", clientUser.client_id)
    .order("start_at", { ascending: false });

  return NextResponse.json({ appointments: appointments || [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const clientUser = await getClientUser(supabase);
  if (!clientUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { serviceId, serviceName, startAt, durationMins } = body;

  if (!serviceName || !startAt || !durationMins) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const endAt = new Date(new Date(startAt).getTime() + durationMins * 60000).toISOString();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      workspace_id: clientUser.workspace_id,
      client_id: clientUser.client_id,
      service_id: serviceId || null,
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
