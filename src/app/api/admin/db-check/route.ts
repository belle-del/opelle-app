import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createSupabaseAdminClient();
  const results: Record<string, unknown> = {};

  // Check service_types table columns by trying to read
  const { data: stData, error: stError } = await admin
    .from("service_types")
    .select("*")
    .limit(1);
  results.service_types = stError
    ? { error: stError.message, code: stError.code }
    : { exists: true, sampleColumns: stData?.[0] ? Object.keys(stData[0]) : "empty table", rowCount: stData?.length };

  // Check if default_duration_mins column exists by trying to query it
  const { error: durErr } = await admin
    .from("service_types")
    .select("default_duration_mins")
    .limit(1);
  results.has_default_duration_mins = durErr ? { error: durErr.message } : true;

  // Check if booking_type column exists
  const { error: btErr } = await admin
    .from("service_types")
    .select("booking_type")
    .limit(1);
  results.has_booking_type = btErr ? { error: btErr.message } : true;

  // Check workspaces table
  const { data: wsData, error: wsError } = await admin
    .from("workspaces")
    .select("id, name, stylist_code, owner_id")
    .limit(3);
  results.workspaces = wsError
    ? { error: wsError.message }
    : { count: wsData?.length, data: wsData };

  // Check client_users table
  const { data: cuData, error: cuError } = await admin
    .from("client_users")
    .select("*")
    .limit(3);
  results.client_users = cuError
    ? { error: cuError.message, code: cuError.code }
    : { count: cuData?.length, data: cuData };

  // Check inspo_submissions table
  const { data: inspoData, error: inspoError } = await admin
    .from("inspo_submissions")
    .select("id")
    .limit(1);
  results.inspo_submissions = inspoError
    ? { error: inspoError.message }
    : { exists: true, count: inspoData?.length };

  // Check client-inspo storage bucket
  const { data: bucketData, error: bucketError } = await admin.storage.getBucket("client-inspo");
  results.client_inspo_bucket = bucketError
    ? { error: bucketError.message }
    : { exists: true, public: bucketData?.public };

  // Check mentis tables
  const { error: mcErr } = await admin.from("mentis_conversations").select("id").limit(1);
  results.mentis_conversations = mcErr ? { error: mcErr.message } : { exists: true };

  const { error: mmErr } = await admin.from("mentis_messages").select("id").limit(1);
  results.mentis_messages = mmErr ? { error: mmErr.message } : { exists: true };

  // Check activity_log
  const { data: alData, error: alErr } = await admin.from("activity_log").select("id").limit(1);
  results.activity_log = alErr ? { error: alErr.message } : { exists: true, count: alData?.length };

  // Check client_notifications
  const { error: cnErr } = await admin.from("client_notifications").select("id").limit(1);
  results.client_notifications = cnErr ? { error: cnErr.message } : { exists: true };

  // Check rebook_requests
  const { error: rrErr } = await admin.from("rebook_requests").select("id").limit(1);
  results.rebook_requests = rrErr ? { error: rrErr.message } : { exists: true };

  return NextResponse.json(results, { status: 200 });
}
