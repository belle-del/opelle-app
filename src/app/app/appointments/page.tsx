"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Appointment, AppointmentStatus, Client } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { formatDbError } from "@/lib/db/health";
import { useRepo } from "@/lib/repo";

const filterOptions = ["upcoming", "past", "all"] as const;

type Filter = (typeof filterOptions)[number];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [search, setSearch] = useState("");
  const [dbError, setDbError] = useState<string | null>(null);
  const repo = useRepo();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (active) {
          const [appointmentsData, clientsData] = await Promise.all([
            repo.getAppointments(),
            repo.getClients(),
          ]);
          setAppointments(appointmentsData);
          setClients(clientsData);
        }
      } catch (error) {
        const message = formatDbError(error);
        setDbError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("opelle:db-error", { detail: message })
          );
        }
        const [appointmentsData, clientsData] = await Promise.all([
          repo.getAppointments(),
          repo.getClients(),
        ]);
        setAppointments(appointmentsData);
        setClients(clientsData);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [repo]);

  const clientMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const filtered = useMemo(() => {
    const now = new Date().toISOString();
    const term = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      if (filter === "upcoming" && appointment.startAt < now) return false;
      if (filter === "past" && appointment.startAt >= now) return false;

      if (!term) return true;

      const clientName = clientMap.has(appointment.clientId)
        ? getClientDisplayName(clientMap.get(appointment.clientId)!)
        : "unknown client";

      return [clientName, appointment.serviceName]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [appointments, clientMap, filter, search]);

  const statusTone = (status: AppointmentStatus) => {
    if (status === "completed") return "text-emerald-600 dark:text-emerald-200";
    if (status === "cancelled") return "text-rose-600 dark:text-rose-300";
    return "text-amber-700 dark:text-amber-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Appointments</h2>
          <p className="text-muted-foreground">
            Schedule sessions and track upcoming vs past visits.
          </p>
        </div>
        <Link
          href="/app/appointments/new"
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold op-on-accent transition hover:bg-emerald-300"
        >
          New Appointment
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === value
                ? "bg-muted text-foreground"
                : "border border-border text-foreground"
            }`}
          >
            {value === "upcoming"
              ? "Upcoming"
              : value === "past"
              ? "Past"
              : "All"}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
        placeholder="Search by client or service"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted-foreground">
            <p>No appointments in this view yet. Schedule one to get started.</p>
            <Link
              href="/app/appointments/new"
              className="mt-4 inline-flex rounded-full border border-emerald-500/60 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-200"
            >
              Create first appointment
            </Link>
          </div>
        ) : (
          filtered.map((appointment) => {
            const client = clientMap.get(appointment.clientId);
            const clientName = client
              ? getClientDisplayName(client)
              : "Unknown client";

            return (
              <div
                key={appointment.id}
                className="rounded-2xl border border-border bg-card/70 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/app/appointments/${appointment.id}`}
                      className="text-lg font-semibold text-foreground transition hover:text-emerald-600 dark:text-emerald-200"
                    >
                      {appointment.serviceName}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {client ? (
                        <Link
                          href={`/app/clients/${client.id}`}
                          className="transition hover:text-emerald-600 dark:text-emerald-200"
                        >
                          {clientName}
                        </Link>
                      ) : (
                        clientName
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{new Date(appointment.startAt).toLocaleString()}</p>
                    <p>{appointment.durationMin} min</p>
                    <p className={statusTone(appointment.status)}>
                      {appointment.status}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
