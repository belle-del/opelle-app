import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClientNotification } from "@/lib/client-notifications";

export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  const body = await request.json();
  const { serviceType, preferredDays, preferredTime, timeframe, notes } = body;

  if (!serviceType) {
    return NextResponse.json({ error: "Service type is required" }, { status: 400 });
  }

  // Try cookie-based auth first, fall back to clientId from body
  let clientUser: { workspace_id: string; client_id: string } | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await admin
        .from("client_users")
        .select("workspace_id, client_id")
        .eq("auth_user_id", user.id)
        .single();
      clientUser = data;
    }
  } catch (e) {
    console.error("[client/appointments/request] Auth error (will try fallback):", e);
  }

  // Fallback: accept clientId + workspaceId from body (page is middleware-protected)
  if (!clientUser && body.clientId && body.workspaceId) {
    clientUser = { workspace_id: body.workspaceId, client_id: body.clientId };
  }

  // Fallback 2: look up client_users by clientId from body
  if (!clientUser && body.clientId) {
    const { data } = await admin
      .from("client_users")
      .select("workspace_id, client_id")
      .eq("client_id", body.clientId)
      .single();
    clientUser = data;
  }

  if (!clientUser) {
    console.error("[client/appointments/request] No client user found. Auth likely failed on Vercel.");
    return NextResponse.json({ error: "Could not identify client. Please refresh and try again." }, { status: 401 });
  }

  const { data: rebookRequest, error } = await admin
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
    console.error("[client/appointments/request] Insert failed:", error.message);
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
