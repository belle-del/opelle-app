import { NextRequest, NextResponse } from "next/server";
import { requirePermission, createTeamInvite, listPendingInvites } from "@/lib/db/team";

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("team.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { role, email } = await req.json();
    if (!role) {
      return NextResponse.json({ error: "role required" }, { status: 400 });
    }

    const validRoles = ["admin", "instructor", "stylist", "student", "front_desk"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const invite = await createTeamInvite(auth.workspaceId, role, auth.userId, email);
    if (!invite) {
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    // Build invite URL
    const origin = req.headers.get("origin") || req.headers.get("host") || "https://opelle.app";
    const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;
    const url = `${baseUrl}/join/${invite.token}`;

    return NextResponse.json({ invite, url }, { status: 201 });
  } catch (err) {
    console.error("[team/invite] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await requirePermission("team.manage");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const invites = await listPendingInvites(auth.workspaceId);
    return NextResponse.json({ invites });
  } catch (err) {
    console.error("[team/invite] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
