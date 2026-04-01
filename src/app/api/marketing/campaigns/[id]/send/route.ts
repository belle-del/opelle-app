import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/db/team";
import { updateCampaign, resolveAudience, createMessageLog } from "@/lib/db/marketing";
import { emitCommsEvent } from "@/lib/comms-events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission("marketing.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Get campaign
    const admin = createSupabaseAdminClient();
    const { data: campaign } = await admin
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", auth.workspaceId)
      .single();

    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (campaign.status === "sent" || campaign.status === "sending") {
      return NextResponse.json({ error: "Campaign already sent" }, { status: 400 });
    }

    // Mark as sending
    await updateCampaign(id, auth.workspaceId, { status: "sending" });

    // Resolve audience
    const audience = await resolveAudience(auth.workspaceId, campaign.audience_filter || {});

    let sentCount = 0;
    for (const client of audience) {
      try {
        emitCommsEvent({
          event: "marketing.campaign",
          workspaceId: auth.workspaceId,
          clientId: client.id,
          context: { clientName: client.first_name, campaignName: campaign.name },
          templateId: campaign.template_id || undefined,
        });

        await createMessageLog({
          workspaceId: auth.workspaceId,
          clientId: client.id,
          templateId: campaign.template_id || undefined,
          source: "campaign",
          channel: "in_app",
          metadata: { campaignId: id, campaignName: campaign.name },
        });

        sentCount++;
      } catch {
        // Continue sending to other clients
      }
    }

    // Mark as sent
    await updateCampaign(id, auth.workspaceId, {
      status: "sent",
      sent_at: new Date().toISOString(),
      recipients_count: sentCount,
    });

    return NextResponse.json({ sent: sentCount, total: audience.length });
  } catch (err) {
    console.error("[marketing/campaigns/send] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
