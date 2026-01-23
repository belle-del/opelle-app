"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, Client } from "@/lib/types";
import { getClientDisplayName } from "@/lib/types";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-styles.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    appointment: Appointment;
    client: Client | undefined;
  };
}

interface CalendarWidgetProps {
  appointments: Appointment[];
  clients: Client[];
}

export function CalendarWidget({ appointments, clients }: CalendarWidgetProps) {
  const router = useRouter();

  const clientMap = useMemo(() => {
    return new Map(clients.map((c) => [c.id, c]));
  }, [clients]);

  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((appt) => {
      const client = clientMap.get(appt.clientId);
      const start = new Date(appt.startAt);
      const end = appt.endAt
        ? new Date(appt.endAt)
        : new Date(start.getTime() + appt.durationMins * 60000);

      return {
        id: appt.id,
        title: client ? getClientDisplayName(client) : "Unknown Client",
        start,
        end,
        resource: {
          appointment: appt,
          client,
        },
      };
    });
  }, [appointments, clientMap]);

  const handleNavigateToCalendar = () => {
    router.push("/app/appointments");
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const { appointment } = event.resource;
    let backgroundColor = "#10b981";
    let borderColor = "#059669";

    if (appointment.status === "cancelled") {
      backgroundColor = "#ef4444";
      borderColor = "#dc2626";
    } else if (appointment.status === "completed") {
      backgroundColor = "#6366f1";
      borderColor = "#4f46e5";
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: "2px",
        borderStyle: "solid",
        borderRadius: "6px",
        color: "white",
        fontSize: "0.75rem",
        fontWeight: "500",
      },
    };
  };

  return (
    <div
      className="calendar-container cursor-pointer"
      onClick={handleNavigateToCalendar}
    >
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 400 }}
        view="month"
        views={["month"]}
        eventPropGetter={eventStyleGetter}
        toolbar={false}
        popup
        tooltipAccessor={(event: CalendarEvent) => {
          const { appointment } = event.resource;
          return `${event.title} - ${appointment.serviceName}`;
        }}
      />
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          Click calendar to view full schedule
        </p>
      </div>
    </div>
  );
}
