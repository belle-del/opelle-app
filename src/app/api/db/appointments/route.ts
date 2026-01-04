import { NextRequest, NextResponse } from "next/server";
import { createAppointment, listAppointments } from "@/lib/db/appointments";
import { formatDbError } from "@/lib/db/health";

export async function GET(_request: NextRequest) {
  try {
    const data = await listAppointments();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const data = await createAppointment(payload);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: formatDbError(error) },
      { status: 500 }
    );
  }
}
