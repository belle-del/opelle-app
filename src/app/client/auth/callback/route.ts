import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type JoinData = {
  workspaceId: string;
  stylistId?: string;
  firstName: string;
  lastName: string;
  inviteId?: string;
  existingClientId?: string;
};

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
  const meta = sessionData.user.user_metadata || {};
  const admin = createSupabaseAdminClient();

  console.log("[client-callback] Auth success for", email, "userId:", userId);

  // ── 1. Check if client_users record already exists ──
  const { data: existingClientUser, error: cuError } = await admin
    .from("client_users")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (cuError) {
    console.error("[client-callback] client_users query error:", cuError.message);
  }

  if (existingClientUser) {
    console.log("[client-callback] Already linked — going to portal");
    return NextResponse.redirect(`${origin}/client`);
  }

  // ── 2. Get join data: try cookie → user_metadata → server-side table ──
  let joinData: JoinData | null = null;

  // Source A: Cookie (works if magic link opened in same browser)
  const joinDataCookie = cookieStore.get("opelle_join_data");
  if (joinDataCookie?.value) {
    try {
      joinData = JSON.parse(joinDataCookie.value);
      console.log("[client-callback] Got join data from cookie");
    } catch {
      console.error("[client-callback] Invalid join data cookie");
    }
  }

  // Source B: User metadata (set by signInWithOtp data param — survives cross-browser)
  if (!joinData && meta.join_workspace_id) {
    joinData = {
      workspaceId: meta.join_workspace_id,
      stylistId: meta.join_stylist_id || undefined,
      firstName: meta.first_name || "",
      lastName: meta.last_name || "",
      inviteId: meta.join_invite_id || undefined,
      existingClientId: meta.join_existing_client_id || undefined,
    };
    console.log("[client-callback] Got join data from user_metadata");
  }

  // Source C: Server-side pending_client_joins table (if it exists)
  if (!joinData && email) {
    try {
      const { data: pendingJoin } = await admin
        .from("pending_client_joins")
        .select("*")
        .eq("email", email.toLowerCase())
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingJoin) {
        joinData = {
          workspaceId: pendingJoin.workspace_id,
          stylistId: pendingJoin.stylist_id,
          firstName: pendingJoin.first_name,
          lastName: pendingJoin.last_name || "",
          inviteId: pendingJoin.invite_id,
          existingClientId: pendingJoin.existing_client_id,
        };
        console.log("[client-callback] Got join data from pending_client_joins");
        await admin
          .from("pending_client_joins")
          .update({ used_at: new Date().toISOString() })
          .eq("id", pendingJoin.id);
      }
    } catch {
      // Table might not exist — that's ok, we have other sources
      console.log("[client-callback] pending_client_joins table not available");
    }
  }

  // ── 3. If we have join data, create/link the client ──
  if (joinData) {
    let clientId = joinData.existingClientId;

    // Check if client record already exists for this email (case-insensitive)
    if (!clientId && email) {
      const { data: existingClient } = await admin
        .from("clients")
        .select("id")
        .eq("workspace_id", joinData.workspaceId)
        .ilike("email", email)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        console.log("[client-callback] Found existing client by email:", clientId);
      }
    }

    // Also try dedup function to match by name + email/phone
    if (!clientId && joinData.firstName) {
      try {
        const { data: canonicalId } = await admin.rpc("find_canonical_client", {
          p_first_name: joinData.firstName,
          p_last_name: joinData.lastName || null,
          p_email: email || null,
          p_phone: null,
        });
        if (canonicalId) {
          // Check if the canonical client is in this workspace
          const { data: wsClient } = await admin
            .from("clients")
            .select("id")
            .eq("id", canonicalId)
            .eq("workspace_id", joinData.workspaceId)
            .maybeSingle();
          if (wsClient) {
            clientId = wsClient.id;
            console.log("[client-callback] Found existing client via dedup:", clientId);
          }
        }
      } catch (e) {
        console.log("[client-callback] Dedup check failed (non-critical):", e);
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
      console.log("[client-callback] Created new client:", clientId);
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
    console.log("[client-callback] Linked auth user to client:", clientId);

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

  // ── 4. No join data — try auto-link by email (case-insensitive) ──
  if (email) {
    const { data: matchingClient } = await admin
      .from("clients")
      .select("id, workspace_id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (matchingClient) {
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

      console.log("[client-callback] Auto-linked", email, "to client", matchingClient.id);
      return NextResponse.redirect(`${origin}/client`);
    }
  }

  // ── 5. Nothing worked — send to join ──
  console.log("[client-callback] No client record or join data for", email);
  return NextResponse.redirect(`${origin}/client/join?error=no_account`);
}
