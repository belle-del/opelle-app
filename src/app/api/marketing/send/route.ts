import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/db/team";
import { createMessageLog } from "@/lib/db/marketing";
import { emitCommsEvent } from "@/lib/comms-events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("marketing.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { clientIds, templateId, body } = await req.json();
    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: "clientIds array required" }, { status: 400 });
    }
    if (clientIds.length > 100) {
      return NextResponse.json({ error: "Max 100 clients per send" }, { status: 400 });
    }
    if (!templateId && !body) {
      return NextResponse.json({ error: "templateId or body required" }, { status: 400 });
    }

    // Fetch client details for personalization
    const admin = createSupabaseAdminClient();
    const { data: clients } = await admin
      .from("clients")
      .select("id, first_name, email")
      .eq("workspace_id", auth.workspaceId)
      .in("id", clientIds);

    if (!clients || clients.length === 0) {
      return NextResponse.json({ error: "No valid clients found" }, { status: 400 });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const client of clients) {
      try {
        // Dispatch via kernel (fire-and-forget)
        emitCommsEvent({
          event: "marketing.bulk_send",
          workspaceId: auth.workspaceId,
          clientId: client.id,
          context: { clientName: client.first_name },
          templateId: templateId || undefined,
          body: body || undefined,
        });

        // Log the send
        await createMessageLog({
          workspaceId: auth.workspaceId,
          clientId: client.id,
          templateId: templateId || undefined,
          source: "manual",
          channel: "in_app",
          body: body || undefined,
        });

        sentCount++;
      } catch {
        errors.push(client.id);
      }
    }

    return NextResponse.json({ sent: sentCount, errors: errors.length, total: clients.length });
  } catch (err) {
    console.error("[marketing/send] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
