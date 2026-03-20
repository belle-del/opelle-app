import { NextResponse } from "next/server";
import { createFormulaEntry, listAllFormulaEntries } from "@/lib/db/formula-entries";
import { logActivity } from "@/lib/db/activity-log";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") || undefined;
    const serviceTypeId = searchParams.get("serviceTypeId") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const search = searchParams.get("search") || undefined;

    const entries = await listAllFormulaEntries({ clientId, serviceTypeId, dateFrom, dateTo, search });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to list formula entries:", error);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.clientId || !body.serviceTypeId || !body.rawNotes?.trim()) {
      return NextResponse.json(
        { error: "clientId, serviceTypeId, and rawNotes are required" },
        { status: 400 }
      );
    }

    const entry = await createFormulaEntry({
      clientId: body.clientId,
      serviceTypeId: body.serviceTypeId,
      rawNotes: body.rawNotes.trim(),
      generalNotes: body.generalNotes?.trim() || undefined,
      serviceDate: body.serviceDate || undefined,
    });

    if (!entry) {
      return NextResponse.json({ error: "FORMULA-ERR-001: Entry creation returned null (likely RLS or workspace lookup issue)" }, { status: 500 });
    }

    await logActivity("formula.created", "formula", entry.id, entry.serviceDate);
    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to create formula entry:", error);
    return NextResponse.json({ error: `FORMULA-ERR-002: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
