import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { emitCommsEvent } from "@/lib/comms-events";
import { nowLocal } from "@/lib/utils";

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  // Get all clients with comms prefs that have rebook_reminder_weeks > 0
  const { data: prefs } = await admin
    .from("communication_preferences")
    .select("workspace_id, client_id, rebook_reminder_weeks")
    .gt("rebook_reminder_weeks", 0);

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ checked: 0, reminders_sent: 0 });
  }

  let remindersSent = 0;

  for (const pref of prefs) {
    // Get last completed appointment
    const { data: lastAppt } = await admin
      .from("appointments")
      .select("start_at, service_name")
      .eq("client_id", pref.client_id)
      .eq("status", "completed")
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastAppt) continue;

    const lastVisitDate = new Date(lastAppt.start_at);
    const daysSince = Math.floor(
      (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const thresholdDays = pref.rebook_reminder_weeks * 7;

    if (daysSince < thresholdDays) continue;

    // Check no upcoming appointment
    const { data: upcoming } = await admin
      .from("appointments")
      .select("id")
      .eq("client_id", pref.client_id)
      .eq("status", "scheduled")
      .gt("start_at", nowLocal())
      .limit(1)
      .maybeSingle();

    if (upcoming) continue;

    // Get client name
    const { data: client } = await admin
      .from("clients")
      .select("first_name")
      .eq("id", pref.client_id)
      .single();

    await emitCommsEvent({
      event: "rebook.reminder",
      workspaceId: pref.workspace_id,
      clientId: pref.client_id,
      context: {
        clientName: client?.first_name || "there",
        daysSinceLastVisit: daysSince,
        weeksSinceVisit: Math.floor(daysSince / 7),
        lastServiceName: lastAppt.service_name,
        lastServiceDate: lastAppt.start_at,
        title: "Time for your next appointment?",
      },
    });
    remindersSent++;
  }

  return NextResponse.json({ checked: prefs.length, reminders_sent: remindersSent });
}
