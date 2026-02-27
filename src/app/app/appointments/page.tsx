import { listAppointments } from "@/lib/db/appointments";
import { listClients } from "@/lib/db/clients";
import { V7Calendar } from "./_components/V7Calendar";

export default async function AppointmentsPage() {
  const [appointments, clients] = await Promise.all([
    listAppointments(),
    listClients(),
  ]);

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-on-bark-faint)" }}>
          Schedule
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "24px", color: "var(--text-on-bark)", fontWeight: 300 }}>
          Appointments
        </h2>
      </div>
      <V7Calendar appointments={appointments} clients={clients} />
    </div>
  );
}
