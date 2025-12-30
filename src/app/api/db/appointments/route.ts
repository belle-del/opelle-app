import { NextResponse } from "next/server";
import { createAppointment, listAppointments } from "@/lib/db/appointments";
import { formatDbError } from "@/lib/db/health";

export async function GET() {
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

export async function POST(request: Request) {
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
