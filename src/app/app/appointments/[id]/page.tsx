import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAppointment } from "@/lib/db/appointments";
import { getClient } from "@/lib/db/clients";
import { getClientDisplayName } from "@/lib/types";
import { formatDateTime, formatDate } from "@/lib/utils";
import { ArrowLeft, User, Clock, FileText } from "lucide-react";
import { AppointmentActions } from "./_components/AppointmentActions";

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  const appointment = await getAppointment(id);

  if (!appointment) {
    notFound();
  }

  const client = await getClient(appointment.clientId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/app/appointments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Appointments
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-semibold">{appointment.serviceName}</h2>
              <Badge
                variant={
                  appointment.status === "completed" ? "success" :
                  appointment.status === "cancelled" ? "danger" : "outline"
                }
              >
                {appointment.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {formatDateTime(appointment.startAt)}
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-black font-medium">
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
              <p>{formatDate(appointment.startAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Time</p>
              <p>{new Date(appointment.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
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

      {/* Service Log placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Service Log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Document the service details, formulas used, and learnings.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-white/20 p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Service log feature coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              You&apos;ll be able to add consultation notes, formulas, photos, and aftercare instructions here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
