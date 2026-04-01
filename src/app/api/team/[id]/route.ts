import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getTeamMember, updateTeamMember, deactivateTeamMember, countActiveOwners } from "@/lib/db/team";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission("team.view");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const member = await getTeamMember(id, auth.workspaceId);
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ member });
  } catch (err) {
    console.error("[team/id] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission("team.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    // Last-owner protection
    if (body.role && body.role !== "owner") {
      const member = await getTeamMember(id, auth.workspaceId);
      if (member?.role === "owner") {
        const ownerCount = await countActiveOwners(auth.workspaceId);
        if (ownerCount <= 1) {
          return NextResponse.json({ error: "Cannot change the last owner's role" }, { status: 400 });
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.role !== undefined) updates.role = body.role;
    if (body.displayName !== undefined) updates.display_name = body.displayName;
    if (body.permissions !== undefined) updates.permissions = body.permissions;
    if (body.status !== undefined) updates.status = body.status;
    if (body.payType !== undefined) updates.pay_type = body.payType;
    if (body.hireDate !== undefined) updates.hire_date = body.hireDate;
    if (body.email !== undefined) updates.email = body.email;
    if (body.phone !== undefined) updates.phone = body.phone;

    const updated = await updateTeamMember(id, auth.workspaceId, updates);
    if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

    return NextResponse.json({ member: updated });
  } catch (err) {
    console.error("[team/id] PATCH error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission("team.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Last-owner protection
    const member = await getTeamMember(id, auth.workspaceId);
    if (member?.role === "owner") {
      const ownerCount = await countActiveOwners(auth.workspaceId);
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "Cannot deactivate the last owner" }, { status: 400 });
      }
    }

    const success = await deactivateTeamMember(id, auth.workspaceId);
    if (!success) return NextResponse.json({ error: "Deactivation failed" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[team/id] DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
