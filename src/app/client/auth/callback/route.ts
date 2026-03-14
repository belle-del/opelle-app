import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/client/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !sessionData.user) {
    return NextResponse.redirect(`${origin}/client/login?error=auth_failed`);
  }

  const userId = sessionData.user.id;
  const admin = createSupabaseAdminClient();

  // Check if client_users record already exists
  const { data: existingClientUser } = await admin
    .from("client_users")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (existingClientUser) {
    // Already linked — go to portal
    return NextResponse.redirect(`${origin}/client`);
  }

  // Get pending join data from cookie
  const joinDataCookie = cookieStore.get("opelle_join_data");
  if (!joinDataCookie?.value) {
    return NextResponse.redirect(`${origin}/client/join?error=no_join_data`);
  }

  let joinData: {
    workspaceId: string;
    stylistId?: string;
    firstName: string;
    lastName: string;
    inviteId?: string;
    existingClientId?: string;
  };

  try {
    joinData = JSON.parse(joinDataCookie.value);
  } catch {
    return NextResponse.redirect(`${origin}/client/join?error=invalid_join_data`);
  }

  // Check if client record already exists for this email in this workspace
  const email = sessionData.user.email;
  let clientId = joinData.existingClientId;

  if (!clientId && email) {
    const { data: existingClient } = await admin
      .from("clients")
      .select("id")
      .eq("workspace_id", joinData.workspaceId)
      .eq("email", email)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
    }
  }

  // Create client record if needed
  if (!clientId) {
    const { data: newClient, error: clientError } = await admin
      .from("clients")
      .insert({
        workspace_id: joinData.workspaceId,
        first_name: joinData.firstName,
        last_name: joinData.lastName,
        email: email,
        primary_stylist_id: joinData.stylistId || null,
        tags: [],
      })
      .select("id")
      .single();

    if (clientError || !newClient) {
      return NextResponse.redirect(`${origin}/client/join?error=client_creation_failed`);
    }
    clientId = newClient.id;
  }

  // Create client_users link
  await admin
    .from("client_users")
    .insert({
      auth_user_id: userId,
      workspace_id: joinData.workspaceId,
      client_id: clientId,
    });

  // Mark invite as used if applicable
  if (joinData.inviteId) {
    await admin
      .from("client_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", joinData.inviteId);
  }

  // Create welcome notification
  await admin
    .from("client_notifications")
    .insert({
      workspace_id: joinData.workspaceId,
      client_id: clientId,
      type: "system",
      title: "Welcome to Opelle — you're all set",
      body: "Your account is linked and ready to go.",
      action_url: "/client",
    });

  // Clear join data cookie
  cookieStore.set("opelle_join_data", "", { maxAge: 0 });

  return NextResponse.redirect(`${origin}/client`);
}
