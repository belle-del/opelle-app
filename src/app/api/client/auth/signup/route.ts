import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, workspaceId, stylistId, inviteId, existingClientId } =
      await request.json();

    if (!email || !password || !firstName || !workspaceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // ── 1. Create auth user (auto-confirmed) ──
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName?.trim() || "",
        role: "client",
      },
    });

    if (authError) {
      console.error("[client-signup] Auth create failed:", authError.message);

      // User already exists — that's OK, they should use login
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        return NextResponse.json(
          { error: "An account with that email already exists. Try signing in instead." },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;
    console.log("[client-signup] Created auth user:", userId);

    // ── 2. Find or create client record ──
    let clientId = existingClientId || null;

    if (!clientId) {
      // Check for existing client by email in this workspace
      const { data: existingClient } = await admin
        .from("clients")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        console.log("[client-signup] Found existing client:", clientId);
      }
    }

    if (!clientId) {
      const { data: newClient, error: clientError } = await admin
        .from("clients")
        .insert({
          workspace_id: workspaceId,
          first_name: firstName.trim(),
          last_name: lastName?.trim() || "",
          email: email.trim().toLowerCase(),
          primary_stylist_id: stylistId || null,
          tags: [],
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        console.error("[client-signup] Client creation failed:", clientError?.message);
        // Clean up: delete the auth user we just created
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Failed to create client record" }, { status: 500 });
      }
      clientId = newClient.id;
      console.log("[client-signup] Created new client:", clientId);
    }

    // ── 2b. Canonical dedup & stylist assignment ──
    try {
      const { data: canonicalId } = await admin.rpc("find_canonical_client", {
        p_first_name: firstName.trim(),
        p_last_name: lastName?.trim() || null,
        p_email: email.trim().toLowerCase(),
        p_phone: null,
      });

      if (canonicalId && canonicalId !== clientId) {
        await admin
          .from("clients")
          .update({ canonical_client_id: canonicalId })
          .eq("id", clientId);
      }
    } catch (e) {
      console.error("[client-signup] canonical dedup failed (non-critical):", e);
    }

    // Create client_stylist_assignments row
    if (stylistId) {
      try {
        await admin.from("client_stylist_assignments").upsert(
          {
            workspace_id: workspaceId,
            client_id: clientId,
            stylist_id: stylistId,
            is_primary: true,
          },
          { onConflict: "workspace_id,client_id,stylist_id" }
        );
      } catch (e) {
        console.error("[client-signup] stylist assignment failed (non-critical):", e);
      }
    }

    // ── 3. Create client_users link ──
    const { error: linkError } = await admin
      .from("client_users")
      .insert({
        auth_user_id: userId,
        workspace_id: workspaceId,
        client_id: clientId,
      });

    if (linkError) {
      console.error("[client-signup] client_users link failed:", linkError.message);
      // Don't delete the auth user — they can retry login
      return NextResponse.json({ error: "Failed to link account" }, { status: 500 });
    }

    // ── 4. Mark invite as used ──
    if (inviteId) {
      await admin
        .from("client_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", inviteId);
    }

    // ── 5. Create welcome notification ──
    try {
      await admin
        .from("client_notifications")
        .insert({
          workspace_id: workspaceId,
          client_id: clientId,
          type: "system",
          title: "Welcome to Opelle — you're all set",
          body: "Your account is linked and ready to go.",
          action_url: "/client",
        });
    } catch {
      // Non-critical
    }

    console.log("[client-signup] Complete! userId:", userId, "clientId:", clientId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[client-signup] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
