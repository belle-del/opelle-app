import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface ClientInvite {
  id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: clientUsers } = await admin
    .from("client_users")
    .select("created_at")
    .eq("client_id", id)
    .limit(1);

  const clientUser = clientUsers?.[0] || null;

  const { data: invites } = await admin
    .from("client_invites")
    .select("id, token, expires_at, used_at, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    hasAccount: !!clientUser,
    accountCreatedAt: clientUser?.created_at || null,
    pendingInvites: (invites || []).filter((i: ClientInvite) => !i.used_at && new Date(i.expires_at) > new Date()),
  });
}
