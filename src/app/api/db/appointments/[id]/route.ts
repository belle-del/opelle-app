import { NextRequest, NextResponse } from "next/server";
import {
  deleteAppointment,
  getAppointment,
  updateAppointment,
} from "@/lib/db/appointments";
import { formatDbError } from "@/lib/db/health";

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    const data = await getAppointment(id);
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
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    const payload = (await request.json()) as Record<string, unknown>;
    const data = await updateAppointment(id, payload);
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
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    await deleteAppointment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}
