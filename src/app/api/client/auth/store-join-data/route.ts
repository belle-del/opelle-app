import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Stores join data server-side so it survives magic link redirect
// Called by /client/join before sending the OTP email
export async function POST(request: Request) {
  const body = await request.json();
  const { email, workspaceId, stylistId, firstName, lastName, inviteId, existingClientId } = body;

  if (!email || !workspaceId || !firstName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Upsert: if there's already a pending join for this email, overwrite it
  // First delete any existing unused pending joins for this email
  await admin
    .from("pending_client_joins")
    .delete()
    .eq("email", email.toLowerCase().trim())
    .is("used_at", null);

  // Insert new pending join
  const { error } = await admin
    .from("pending_client_joins")
    .insert({
      email: email.toLowerCase().trim(),
      workspace_id: workspaceId,
      stylist_id: stylistId || null,
      first_name: firstName,
      last_name: lastName || null,
      invite_id: inviteId || null,
      existing_client_id: existingClientId || null,
    });

  if (error) {
    console.error("[store-join-data] Error:", error.message);
    return NextResponse.json({ error: "Failed to store join data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
