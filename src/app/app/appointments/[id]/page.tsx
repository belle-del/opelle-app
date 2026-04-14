import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAppointment } from "@/lib/db/appointments";
import { getClient } from "@/lib/db/clients";
import { getClientDisplayName } from "@/lib/types";
import { ArrowLeft, User, Clock, FileText } from "lucide-react";
import { AppointmentActions } from "./_components/AppointmentActions";
import { AftercareEditor } from "./_components/AftercareEditor";
import { LocalTime } from "@/components/LocalTime";
import { getAftercarePlanByAppointment } from "@/lib/db/aftercare";

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  const appointment = await getAppointment(id);

  if (!appointment) {
    notFound();
  }

  const [client, aftercarePlan] = await Promise.all([
    getClient(appointment.clientId),
    getAftercarePlanByAppointment(id),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/app/appointments"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "#6B5D4A" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Appointments
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: "#2C2C24" }}>{appointment.serviceName}</h2>
              <Badge
                variant={
                  appointment.status === "completed" ? "success" :
                  appointment.status === "cancelled" ? "danger" :
                  appointment.status === "pending_confirmation" ? "warning" : "outline"
                }
              >
                {appointment.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              <LocalTime iso={appointment.startAt} format="datetime" />
            </p>
          </div>
          <AppointmentActions appointment={appointment} />
        </div>
      </header>

      {/* Info Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client ? (
              <Link
                href={`/app/clients/${client.id}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium" style={{ background: "linear-gradient(135deg, #6A90AE, #8FADC8)" }}>
                    {client.firstName[0]}{client.lastName?.[0] || ""}
                  </div>
                  <div>
                    <p className="font-medium">{getClientDisplayName(client)}</p>
                    {client.email && (
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Client not found</p>
            )}
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
              <p><LocalTime iso={appointment.startAt} format="date" /></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Time</p>
              <p><LocalTime iso={appointment.startAt} format="time" /></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Duration</p>
              <p>{appointment.durationMins} minutes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointment.notes ? (
            <p className="whitespace-pre-wrap">{appointment.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes for this appointment</p>
          )}
        </CardContent>
      </Card>

      {/* Aftercare */}
      <AftercareEditor
        appointmentId={appointment.id}
        clientId={appointment.clientId}
        existingPlan={aftercarePlan}
      />
    </div>
  );
}
