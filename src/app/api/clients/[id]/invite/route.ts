import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("workspace_id")
    .eq("id", id)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("client_invites")
    .insert({
      workspace_id: client.workspace_id,
      client_id: id,
      token,
      expires_at: expiresAt,
    });

  if (error) {
    console.error("[invite] Failed:", error.message);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const inviteUrl = `${origin}/client/join?code=${token}`;

  return NextResponse.json({ token, inviteUrl, expiresAt });
}
