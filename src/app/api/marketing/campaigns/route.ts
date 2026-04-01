import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/db/team";
import { listCampaigns, createCampaign } from "@/lib/db/marketing";

export async function GET() {
  try {
    const auth = await requirePermission("marketing.view");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const campaigns = await listCampaigns(auth.workspaceId);
    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error("[marketing/campaigns] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("marketing.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, templateId, audienceFilter, scheduledAt } = await req.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const campaign = await createCampaign({
      workspaceId: auth.workspaceId,
      name,
      templateId,
      audienceFilter,
      scheduledAt,
    });

    if (!campaign) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    console.error("[marketing/campaigns] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
