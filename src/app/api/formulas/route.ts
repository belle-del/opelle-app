import { NextResponse } from "next/server";
import { createFormula, listFormulas } from "@/lib/db/formulas";

export async function GET() {
  try {
    const formulas = await listFormulas();
    return NextResponse.json(formulas);
  } catch (error) {
    console.error("Failed to list formulas:", error);
    return NextResponse.json({ error: "Failed to list formulas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title || !body.serviceType) {
      return NextResponse.json(
        { error: "Title and service type are required" },
        { status: 400 }
      );
    }

    const formula = await createFormula({
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
      return NextResponse.json({ error: "Failed to create formula" }, { status: 500 });
    }

    return NextResponse.json(formula);
  } catch (error) {
    console.error("Failed to create formula:", error);
    return NextResponse.json({ error: "Failed to create formula" }, { status: 500 });
  }
}
