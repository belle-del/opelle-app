"use client";

import { useRouter } from "next/navigation";
import type { Appointment, Client } from "@/lib/types";
import { CalendarView } from "@/components/CalendarView";

interface AppointmentsCalendarProps {
  appointments: Appointment[];
  clients: Client[];
}

export function AppointmentsCalendar({ appointments, clients }: AppointmentsCalendarProps) {
  const router = useRouter();

  const handleUpdate = () => {
    router.refresh();
  };

  return <CalendarView appointments={appointments} clients={clients} onAppointmentUpdate={handleUpdate} />;
}
