import { NextResponse } from "next/server";
import { createAppointment, listAppointments } from "@/lib/db/appointments";
import { logActivity } from "@/lib/db/activity-log";

export async function GET() {
  try {
    const appointments = await listAppointments();
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Failed to list appointments:", error);
    return NextResponse.json({ error: "Failed to list appointments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.clientId || !body.serviceName || !body.startAt) {
      return NextResponse.json(
        { error: "Client ID, service name, and start time are required" },
        { status: 400 }
      );
    }

    const appointment = await createAppointment({
      clientId: body.clientId,
      serviceName: body.serviceName,
      startAt: body.startAt,
      durationMins: body.durationMins,
      notes: body.notes,
      serviceId: body.serviceId,
    });

    if (!appointment) {
      return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
    }

    await logActivity("appointment.created", "appointment", appointment.id, appointment.serviceName || appointment.startAt || appointment.id);
    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Failed to create appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
