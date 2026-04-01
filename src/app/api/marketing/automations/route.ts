import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/db/team";
import { listAutomationRules, createAutomationRule } from "@/lib/db/marketing";

export async function GET() {
  try {
    const auth = await requirePermission("marketing.view");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rules = await listAutomationRules(auth.workspaceId);
    return NextResponse.json({ rules });
  } catch (err) {
    console.error("[marketing/automations] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("marketing.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, trigger, conditions, templateId, delayMinutes } = await req.json();
    if (!name || !trigger) {
      return NextResponse.json({ error: "name and trigger required" }, { status: 400 });
    }

    const validTriggers = ["appointment_booked", "service_completed", "days_since_visit", "client_birthday"];
    if (!validTriggers.includes(trigger)) {
      return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
    }

    const rule = await createAutomationRule({
      workspaceId: auth.workspaceId,
      name,
      trigger,
      conditions,
      templateId,
      delayMinutes,
    });

    if (!rule) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    console.error("[marketing/automations] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
