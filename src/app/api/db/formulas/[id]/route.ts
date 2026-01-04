import { NextRequest, NextResponse } from "next/server";
import { deleteFormula, getFormula, updateFormula } from "@/lib/db/formulas";
import { formatDbError } from "@/lib/db/health";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const p = await (context.params as Promise<{ id: string }> | { id: string });
    const id = p?.id;
    const data = await getFormula(id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const p = await (context.params as Promise<{ id: string }> | { id: string });
    const id = p?.id;
    const payload = (await request.json()) as Record<string, unknown>;
    const data = await updateFormula(id, payload);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const p = await (context.params as Promise<{ id: string }> | { id: string });
    const id = p?.id;
    await deleteFormula(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}
