import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getClient } from "@/lib/db/clients";
import { getAppointmentsForClient } from "@/lib/db/appointments";
import { getFormulasForClient } from "@/lib/db/formulas";
import { getClientDisplayName } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Edit, Calendar, FlaskConical, Plus } from "lucide-react";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const [client, appointments, formulas] = await Promise.all([
    getClient(id),
    getAppointmentsForClient(id),
    getFormulasForClient(id),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/app/clients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-2xl font-medium text-black">
              {client.firstName[0]}
              {client.lastName?.[0] || ""}
            </div>
            <div>
              <h2 className="text-3xl font-semibold">{getClientDisplayName(client)}</h2>
              {client.pronouns && (
                <p className="text-muted-foreground">{client.pronouns}</p>
              )}
            </div>
          </div>
          <Link href={`/app/clients/${client.id}/edit`}>
            <Button variant="secondary">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </header>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.email && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                <p>{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                <p>{client.phone}</p>
              </div>
            )}
            {!client.email && !client.phone && (
              <p className="text-sm text-muted-foreground">No contact info</p>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Added</p>
              <p>{formatDate(client.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {client.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {client.notes ? (
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Appointments</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {appointments.length} total
            </p>
          </div>
          <Link href={`/app/appointments/new?clientId=${client.id}`}>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No appointments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 5).map((appt) => (
                <Link
                  key={appt.id}
                  href={`/app/appointments/${appt.id}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{appt.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(appt.startAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        appt.status === "completed" ? "success" :
                        appt.status === "cancelled" ? "danger" : "outline"
                      }
                    >
                      {appt.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Formulas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formulas.length} saved
            </p>
          </div>
          <Link href={`/app/formulas/new?clientId=${client.id}`}>
            <Button size="sm" variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              New Formula
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {formulas.length === 0 ? (
            <div className="text-center py-8">
              <FlaskConical className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No formulas yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formulas.slice(0, 5).map((formula) => (
                <Link
                  key={formula.id}
                  href={`/app/formulas/${formula.id}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{formula.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formula.serviceType} • {formula.colorLine || "No color line"}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(formula.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
