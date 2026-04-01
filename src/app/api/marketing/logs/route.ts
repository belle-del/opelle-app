import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/db/team";
import { listMessageLogs } from "@/lib/db/marketing";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission("marketing.view");
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const source = url.searchParams.get("source") || undefined;
    const clientId = url.searchParams.get("clientId") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const result = await listMessageLogs(auth.workspaceId, { source, clientId, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[marketing/logs] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
