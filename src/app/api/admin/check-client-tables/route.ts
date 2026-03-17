import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Quick diagnostic: checks which client portal tables exist
export async function GET() {
  const admin = createSupabaseAdminClient();
  const results: Record<string, string> = {};

  const tables = [
    "client_users",
    "client_notifications",
    "client_invites",
    "workspace_members",
    "pending_client_joins",
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).select("id").limit(1);
    results[table] = error ? `MISSING (${error.code}: ${error.message})` : "OK";
  }

  // Check stylist_code column
  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .select("stylist_code")
    .limit(1);
  results["workspaces.stylist_code"] = wsErr
    ? `MISSING COLUMN (${wsErr.message})`
    : ws && ws.length > 0 ? `OK (code: ${ws[0].stylist_code})` : "OK (no workspaces)";

  // Check clients.primary_stylist_id column
  const { error: clientErr } = await admin
    .from("clients")
    .select("primary_stylist_id")
    .limit(1);
  results["clients.primary_stylist_id"] = clientErr
    ? `MISSING COLUMN (${clientErr.message})`
    : "OK";

  const allOk = Object.values(results).every(v => v.startsWith("OK"));

  return NextResponse.json({
    status: allOk ? "ALL_TABLES_EXIST" : "MISSING_TABLES",
    tables: results,
    action: allOk
      ? "Client portal tables are ready!"
      : "Run migrations/006a_client_portal_essential.sql in Supabase SQL Editor",
  });
}
