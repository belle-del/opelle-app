import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    console.error("[client-callback] No code in URL");
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
    console.error("[client-callback] Auth exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/client/login?error=auth_failed`);
  }

  const userId = sessionData.user.id;
  const email = sessionData.user.email;
  const admin = createSupabaseAdminClient();

  // ── 1. Check if client_users record already exists ──
  const { data: existingClientUser, error: cuError } = await admin
    .from("client_users")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (cuError) {
    // Table might not exist — log it but don't crash
    console.error("[client-callback] client_users query error:", cuError.message);
  }

  if (existingClientUser) {
    // Already linked — go to portal
    return NextResponse.redirect(`${origin}/client`);
  }

  // ── 2. Check for join data cookie (set by /client/join flow) ──
  const joinDataCookie = cookieStore.get("opelle_join_data");

  if (joinDataCookie?.value) {
    // ── JOIN FLOW: user came from /client/join with a stylist code ──
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
      console.error("[client-callback] Invalid join data cookie");
      return NextResponse.redirect(`${origin}/client/join?error=invalid_join_data`);
    }

    // Check if client record already exists for this email in this workspace
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
        console.error("[client-callback] Client creation failed:", clientError?.message);
        return NextResponse.redirect(`${origin}/client/join?error=client_creation_failed`);
      }
      clientId = newClient.id;
    }

    // Create client_users link
    const { error: linkError } = await admin
      .from("client_users")
      .insert({
        auth_user_id: userId,
        workspace_id: joinData.workspaceId,
        client_id: clientId,
      });

    if (linkError) {
      console.error("[client-callback] client_users link failed:", linkError.message);
      return NextResponse.redirect(`${origin}/client/join?error=link_failed`);
    }

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

  // ── 3. LOGIN FLOW: no join cookie — user came from /client/login ──
  // Try to auto-link by matching their email to an existing client record
  if (email) {
    const { data: matchingClient } = await admin
      .from("clients")
      .select("id, workspace_id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (matchingClient) {
      // Found an existing client record — auto-link
      const { error: linkError } = await admin
        .from("client_users")
        .insert({
          auth_user_id: userId,
          workspace_id: matchingClient.workspace_id,
          client_id: matchingClient.id,
        });

      if (linkError) {
        console.error("[client-callback] Auto-link failed:", linkError.message);
        return NextResponse.redirect(`${origin}/client/login?error=link_failed`);
      }

      console.log("[client-callback] Auto-linked client", email, "to client", matchingClient.id);
      return NextResponse.redirect(`${origin}/client`);
    }
  }

  // ── 4. No matching client record anywhere — redirect to join ──
  // This user needs to enter a stylist code first
  console.log("[client-callback] No client record found for", email, "— redirecting to join");
  return NextResponse.redirect(`${origin}/client/join?error=no_account`);
}
