import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listClients } from "@/lib/db/clients";
import { getUpcomingAppointments, listAppointments } from "@/lib/db/appointments";
import { listFormulas } from "@/lib/db/formulas";
import { getPendingTasks, getUpcomingReminders } from "@/lib/db/tasks";
import { getClientDisplayName } from "@/lib/types";
import { formatDateTime, isToday } from "@/lib/utils";
import { Plus, Users, Calendar, FlaskConical, CheckSquare, Bell, Clock } from "lucide-react";
import { CalendarWidget } from "@/components/CalendarWidget";

export default async function DashboardPage() {
  const [clients, upcomingAppointments, allAppointments, formulas, tasks, upcomingReminders] = await Promise.all([
    listClients(),
    getUpcomingAppointments(5),
    listAppointments(),
    listFormulas(),
    getPendingTasks(),
    getUpcomingReminders(),
  ]);

  // Create client map for lookups
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  // Count appointments this week
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeekAppointments = allAppointments.filter((a) => {
    const date = new Date(a.startAt);
    return date >= now && date <= weekEnd && a.status === "scheduled";
  });

  // Count today's uncompleted appointments
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todaysUncompletedAppointments = allAppointments.filter((a) => {
    const date = new Date(a.startAt);
    return date >= startOfToday && date <= endOfToday && a.status !== "completed" && a.status !== "cancelled";
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Student Console
        </p>
        <h2 className="text-3xl font-semibold">Dashboard</h2>
        <p className="text-muted-foreground">
          Your command center for clients, appointments, and education.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Clients", value: clients.length, icon: Users, href: "/app/clients" },
          { label: "Upcoming", value: todaysUncompletedAppointments.length, icon: Calendar, href: "/app/appointments" },
          { label: "Formulas", value: formulas.length, icon: FlaskConical, href: "/app/formulas" },
          { label: "Tasks", value: tasks.length, icon: CheckSquare, href: "/app/tasks" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:bg-white/10 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                  </div>
                  <stat.icon className="w-8 h-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Upcoming Reminders Notification */}
      {upcomingReminders.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-amber-100 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Upcoming Reminders ({upcomingReminders.length})
                </h3>
                <div className="space-y-2">
                  {upcomingReminders.map((task) => {
                    const client = task.clientId ? clientMap.get(task.clientId) : undefined;
                    const reminderTime = task.reminderAt ? new Date(task.reminderAt) : null;
                    const now = new Date();
                    const isUrgent = reminderTime && (reminderTime.getTime() - now.getTime()) < 3 * 60 * 60 * 1000; // Less than 3 hours

                    return (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isUrgent ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {reminderTime && (
                              <span className={isUrgent ? 'text-red-300 font-medium' : ''}>
                                {formatDateTime(task.reminderAt!)}
                              </span>
                            )}
                            {client && (
                              <>
                                <span>•</span>
                                <span>{getClientDisplayName(client)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Link href="/app/tasks">
                          <Button size="sm" variant="secondary" className="ml-3">
                            View
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/clients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </Button>
            </Link>
            <Link href="/app/appointments/new">
              <Button variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                New Appointment
              </Button>
            </Link>
            <Link href="/app/formulas/new">
              <Button variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                New Formula
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Widget */}
      <Card>
        <CardHeader>
          <CardTitle>Your Schedule</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your appointments
          </p>
        </CardHeader>
        <CardContent>
          <CalendarWidget appointments={allAppointments} clients={clients} />
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Appointments</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {thisWeekAppointments.length} scheduled this week
              </p>
            </div>
            <Link href="/app/appointments">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming appointments
              </p>
            ) : (
              upcomingAppointments.map((appointment) => {
                const client = clientMap.get(appointment.clientId);
                return (
                  <Link
                    key={appointment.id}
                    href={`/app/appointments/${appointment.id}`}
                    className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {client ? getClientDisplayName(client) : "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.serviceName}
                        </p>
                      </div>
                      <div className="text-right">
                        {isToday(appointment.startAt) && (
                          <Badge variant="success" className="mb-1">Today</Badge>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(appointment.startAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tasks</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {tasks.length} pending
              </p>
            </div>
            <Link href="/app/tasks">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending tasks
              </p>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{task.title}</p>
                    <Badge variant={task.status === "in_progress" ? "warning" : "outline"}>
                      {task.status === "in_progress" ? "In Progress" : "Pending"}
                    </Badge>
                  </div>
                  {task.notes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {task.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
