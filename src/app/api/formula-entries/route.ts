import { NextResponse } from "next/server";
import { createFormulaEntry, getFormulaEntriesForClient } from "@/lib/db/formula-entries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const entries = await getFormulaEntriesForClient(clientId);
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
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to create formula entry:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
