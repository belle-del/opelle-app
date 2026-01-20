import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAppointments } from "@/lib/db/appointments";
import { listClients } from "@/lib/db/clients";
import { getClientDisplayName } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Plus, Calendar, ChevronRight } from "lucide-react";

export default async function AppointmentsPage() {
  const [appointments, clients] = await Promise.all([
    listAppointments(),
    listClients(),
  ]);

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  // Group appointments by status
  const upcoming = appointments.filter((a) => a.status === "scheduled" && new Date(a.startAt) >= new Date());
  const past = appointments.filter((a) => a.status === "completed" || (a.status === "scheduled" && new Date(a.startAt) < new Date()));
  const cancelled = appointments.filter((a) => a.status === "cancelled");

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Schedule
          </p>
          <h2 className="text-3xl font-semibold">Appointments</h2>
          <p className="text-muted-foreground">
            {upcoming.length} upcoming, {past.length} completed
          </p>
        </div>
        <Link href="/app/appointments/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </Link>
      </header>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No appointments yet</h3>
            <p className="text-muted-foreground mb-6">
              Schedule your first appointment to get started.
            </p>
            <Link href="/app/appointments/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Appointment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Upcoming</h3>
              {upcoming.map((appt) => {
                const client = clientMap.get(appt.clientId);
                return (
                  <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                    <Card className="hover:bg-white/10 transition-colors cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {client ? getClientDisplayName(client) : "Unknown Client"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {appt.serviceName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm">{formatDateTime(appt.startAt)}</p>
                              <p className="text-xs text-muted-foreground">{appt.durationMins} min</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-muted-foreground">Past</h3>
              {past.map((appt) => {
                const client = clientMap.get(appt.clientId);
                return (
                  <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                    <Card className="hover:bg-white/10 transition-colors cursor-pointer opacity-75">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {client ? getClientDisplayName(client) : "Unknown Client"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {appt.serviceName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={appt.status === "completed" ? "success" : "outline"}>
                              {appt.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(appt.startAt)}
                            </span>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Cancelled */}
          {cancelled.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-muted-foreground">Cancelled</h3>
              {cancelled.map((appt) => {
                const client = clientMap.get(appt.clientId);
                return (
                  <Link key={appt.id} href={`/app/appointments/${appt.id}`}>
                    <Card className="hover:bg-white/10 transition-colors cursor-pointer opacity-50">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium line-through">
                              {client ? getClientDisplayName(client) : "Unknown Client"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {appt.serviceName}
                            </p>
                          </div>
                          <Badge variant="danger">cancelled</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
