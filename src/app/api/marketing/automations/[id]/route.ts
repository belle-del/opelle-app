import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/db/team";
import { updateAutomationRule, deleteAutomationRule } from "@/lib/db/marketing";

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
    if (body.trigger !== undefined) updates.trigger = body.trigger;
    if (body.conditions !== undefined) updates.conditions = body.conditions;
    if (body.templateId !== undefined) updates.template_id = body.templateId;
    if (body.delayMinutes !== undefined) updates.delay_minutes = body.delayMinutes;
    if (body.active !== undefined) updates.active = body.active;

    const updated = await updateAutomationRule(id, auth.workspaceId, updates);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ rule: updated });
  } catch (err) {
    console.error("[marketing/automations/id] PATCH error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission("marketing.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const success = await deleteAutomationRule(id, auth.workspaceId);
    if (!success) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[marketing/automations/id] DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
