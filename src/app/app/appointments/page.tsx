import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listAppointments } from "@/lib/db/appointments";
import { listClients } from "@/lib/db/clients";
import { Plus, Calendar } from "lucide-react";
import { AppointmentsCalendar } from "./_components/AppointmentsCalendar";

export default async function AppointmentsPage() {
  const [appointments, clients] = await Promise.all([
    listAppointments(),
    listClients(),
  ]);

  const upcoming = appointments.filter(
    (a) => a.status === "scheduled" && new Date(a.startAt) >= new Date()
  );
  const past = appointments.filter(
    (a) =>
      a.status === "completed" ||
      (a.status === "scheduled" && new Date(a.startAt) < new Date())
  );

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
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-16 text-center">
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
        </div>
      ) : (
        <AppointmentsCalendar appointments={appointments} clients={clients} />
      )}
    </div>
  );
}
