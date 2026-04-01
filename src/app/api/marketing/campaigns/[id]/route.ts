import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/db/team";
import { updateCampaign } from "@/lib/db/marketing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission("marketing.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.templateId !== undefined) updates.template_id = body.templateId;
    if (body.audienceFilter !== undefined) updates.audience_filter = body.audienceFilter;
    if (body.scheduledAt !== undefined) updates.scheduled_at = body.scheduledAt;
    if (body.status !== undefined) updates.status = body.status;

    const updated = await updateCampaign(id, auth.workspaceId, updates);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("[marketing/campaigns/id] PATCH error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
