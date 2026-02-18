import { NextResponse } from "next/server";
import { getFormulaEntry, updateFormulaEntry, deleteFormulaEntry } from "@/lib/db/formula-entries";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const entry = await getFormulaEntry(id);

    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to get formula entry:", error);
    return NextResponse.json({ error: "Failed to get" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const entry = await updateFormulaEntry(id, {
      rawNotes: body.rawNotes,
      parsedFormula: body.parsedFormula,
      generalNotes: body.generalNotes,
      serviceTypeId: body.serviceTypeId,
      serviceDate: body.serviceDate,
    });

    if (!entry) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to update formula entry:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteFormulaEntry(id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete formula entry:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
