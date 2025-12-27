"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Appointment, AppointmentStatus, Client } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { getAppointments, getClients } from "@/lib/storage";

const filterOptions = ["upcoming", "past", "all"] as const;

type Filter = (typeof filterOptions)[number];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setAppointments(getAppointments());
    setClients(getClients());
  }, []);

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
    if (status === "completed") return "text-emerald-200";
    if (status === "cancelled") return "text-rose-200";
    return "text-amber-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Appointments</h2>
          <p className="text-slate-300">
            Schedule sessions and track upcoming vs past visits.
          </p>
        </div>
        <Link
          href="/app/appointments/new"
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
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
                ? "bg-slate-100 text-slate-950"
                : "border border-slate-700 text-slate-200"
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
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200"
        placeholder="Search by client or service"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            No appointments in this view yet.
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
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/app/appointments/${appointment.id}`}
                      className="text-lg font-semibold text-slate-100 transition hover:text-emerald-200"
                    >
                      {appointment.serviceName}
                    </Link>
                    <div className="text-sm text-slate-400">
                      {client ? (
                        <Link
                          href={`/app/clients/${client.id}`}
                          className="transition hover:text-emerald-200"
                        >
                          {clientName}
                        </Link>
                      ) : (
                        clientName
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-300">
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
