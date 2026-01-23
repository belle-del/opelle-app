"use client";

import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { Appointment, Client } from "@/lib/types";
import { getClientDisplayName } from "@/lib/types";
import { AppointmentModal } from "./AppointmentModal";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar-styles.css";

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

const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(Calendar);

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

interface CalendarViewProps {
  appointments: Appointment[];
  clients: Client[];
  onAppointmentUpdate?: () => void;
}

export function CalendarView({ appointments, clients, onAppointmentUpdate }: CalendarViewProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<{
    appointment: Appointment;
    client: Client | undefined;
  } | null>(null);
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("calendarView");
      return (savedView as View) || "month";
    }
    return "month";
  });
  const [date, setDate] = useState(new Date());
  const [localAppointments, setLocalAppointments] = useState<Appointment[]>(appointments);

  useEffect(() => {
    setLocalAppointments(appointments);
  }, [appointments]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("calendarView", view);
    }
  }, [view]);

  const clientMap = useMemo(() => {
    return new Map(clients.map((c) => [c.id, c]));
  }, [clients]);

  const events: CalendarEvent[] = useMemo(() => {
    return localAppointments.map((appt) => {
      const client = clientMap.get(appt.clientId);
      const clientName = client ? getClientDisplayName(client) : "Unknown Client";
      const start = new Date(appt.startAt);
      const end = appt.endAt
        ? new Date(appt.endAt)
        : new Date(start.getTime() + appt.durationMins * 60000);

      return {
        id: appt.id,
        title: `${clientName} - ${appt.serviceName}`,
        start,
        end,
        resource: {
          appointment: appt,
          client,
        },
      };
    });
  }, [localAppointments, clientMap]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedAppointment({
      appointment: event.resource.appointment,
      client: event.resource.client,
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedAppointment(null);
    if (onAppointmentUpdate) {
      onAppointmentUpdate();
    }
  }, [onAppointmentUpdate]);

  const handleEventDrop = useCallback(
    async (args: EventInteractionArgs<CalendarEvent>) => {
      const { event, start, end } = args;
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

      // Optimistically update local state
      setLocalAppointments((prev) =>
        prev.map((appt) =>
          appt.id === event.resource.appointment.id
            ? {
                ...appt,
                startAt: startDate.toISOString(),
                durationMins,
              }
            : appt
        )
      );

      try {
        const response = await fetch(`/api/appointments/${event.resource.appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startAt: startDate.toISOString(),
            durationMins,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update appointment");
        }

        if (onAppointmentUpdate) {
          onAppointmentUpdate();
        }
      } catch (error) {
        console.error("Failed to move appointment:", error);
        alert("Failed to move appointment");
        // Revert on error
        setLocalAppointments(appointments);
      }
    },
    [appointments, onAppointmentUpdate]
  );

  const handleEventResize = useCallback(
    async (args: EventInteractionArgs<CalendarEvent>) => {
      const { event, start, end } = args;
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

      // Optimistically update local state
      setLocalAppointments((prev) =>
        prev.map((appt) =>
          appt.id === event.resource.appointment.id
            ? {
                ...appt,
                startAt: startDate.toISOString(),
                durationMins,
              }
            : appt
        )
      );

      try {
        const response = await fetch(`/api/appointments/${event.resource.appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startAt: startDate.toISOString(),
            durationMins,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update appointment");
        }

        if (onAppointmentUpdate) {
          onAppointmentUpdate();
        }
      } catch (error) {
        console.error("Failed to resize appointment:", error);
        alert("Failed to resize appointment");
        // Revert on error
        setLocalAppointments(appointments);
      }
    },
    [appointments, onAppointmentUpdate]
  );

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { appointment } = event.resource;
    let backgroundColor = "#10b981"; // emerald-500
    let borderColor = "#059669"; // emerald-600

    if (appointment.status === "cancelled") {
      backgroundColor = "#ef4444"; // red-500
      borderColor = "#dc2626"; // red-600
    } else if (appointment.status === "completed") {
      backgroundColor = "#6366f1"; // indigo-500
      borderColor = "#4f46e5"; // indigo-600
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: "2px",
        borderStyle: "solid",
        borderRadius: "6px",
        color: "white",
        fontSize: "0.875rem",
        fontWeight: "500",
      },
    };
  }, []);

  return (
    <>
      <div className="calendar-container">
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          eventPropGetter={eventStyleGetter}
          views={["month", "week", "day", "agenda"]}
          defaultView="month"
          resizable
          draggableAccessor={() => true}
          popup
          tooltipAccessor={(event: CalendarEvent) => {
            return event.title;
          }}
        />
      </div>

      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment.appointment}
          client={selectedAppointment.client}
          clients={clients}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
