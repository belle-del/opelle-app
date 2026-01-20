import { NextResponse } from "next/server";
import { getFormula, updateFormula, deleteFormula } from "@/lib/db/formulas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const formula = await getFormula(id);

    if (!formula) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 });
    }

    return NextResponse.json(formula);
  } catch (error) {
    console.error("Failed to get formula:", error);
    return NextResponse.json({ error: "Failed to get formula" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const formula = await updateFormula(id, {
      title: body.title,
      serviceType: body.serviceType,
      colorLine: body.colorLine,
      steps: body.steps,
      notes: body.notes,
      tags: body.tags,
      clientId: body.clientId,
      appointmentId: body.appointmentId,
    });

    if (!formula) {
      return NextResponse.json({ error: "Failed to update formula" }, { status: 500 });
    }

    return NextResponse.json(formula);
  } catch (error) {
    console.error("Failed to update formula:", error);
    return NextResponse.json({ error: "Failed to update formula" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = await deleteFormula(id);

    if (!success) {
      return NextResponse.json({ error: "Failed to delete formula" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete formula:", error);
    return NextResponse.json({ error: "Failed to delete formula" }, { status: 500 });
  }
}
