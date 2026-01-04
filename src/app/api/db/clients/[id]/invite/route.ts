import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db/clients";
import { formatDbError } from "@/lib/db/health";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const p = await (context.params as Promise<{ id: string }> | { id: string });
    const id = p?.id;
    await request.json().catch(() => null);
    const client = await getClient(id);
    if (!client) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const token = id.replace(/-/g, "").slice(0, 12);
    const updatedAt = new Date().toISOString();
    return NextResponse.json({
      ok: true,
      data: {
        token,
        updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}
