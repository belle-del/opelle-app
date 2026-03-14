import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClientNotification } from "@/lib/client-notifications";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: clientUser } = await supabase
    .from("client_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!clientUser) {
    return NextResponse.json({ error: "Not a client user" }, { status: 403 });
  }

  const body = await request.json();
  const { serviceType, preferredDays, preferredTime, timeframe, notes } = body;

  if (!serviceType) {
    return NextResponse.json({ error: "Service type is required" }, { status: 400 });
  }

  const { data: rebookRequest, error } = await supabase
    .from("rebook_requests")
    .insert({
      workspace_id: clientUser.workspace_id,
      client_id: clientUser.client_id,
      service_type: serviceType,
      preferred_dates: preferredDays || [],
      notes: JSON.stringify({
        preferredTime: preferredTime || null,
        timeframe: timeframe || null,
        clientNotes: notes || null,
      }),
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }

  // Create a notification acknowledging the request
  await createClientNotification({
    workspaceId: clientUser.workspace_id,
    clientId: clientUser.client_id,
    type: "booking_update",
    title: "Your booking request has been submitted",
    body: "Your stylist will review it and get back to you soon.",
    actionUrl: "/client",
  });

  return NextResponse.json({ request: rebookRequest });
}
