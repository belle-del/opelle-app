"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EmbeddedAiDemo from "./embedded-ai-demo";
import { flags } from "@/lib/flags";
import type { Appointment, Client, Formula } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { getAppointments, getClients, getFormulas } from "@/lib/storage";

export default function AppDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);

  useEffect(() => {
    setClients(getClients());
    setAppointments(getAppointments());
    setFormulas(getFormulas());
  }, []);

  const now = new Date();
  const nowIso = now.toISOString();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekEndIso = weekEnd.toISOString();

  const clientMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.startAt >= nowIso && appointment.status !== "cancelled"
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, 5);
  }, [appointments, nowIso]);

  const weekAppointments = useMemo(() => {
    return appointments.filter(
      (appointment) =>
        appointment.startAt >= nowIso && appointment.startAt <= weekEndIso
    );
  }, [appointments, nowIso, weekEndIso]);

  const recentClients = useMemo(() => {
    return clients
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [clients]);

  const recentFormulas = useMemo(() => {
    return formulas
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [formulas]);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Today
            </p>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="text-slate-300">
              Your console is running locally with mock data and local storage.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/clients/new"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              New Client
            </Link>
            <Link
              href="/app/appointments/new"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              New Appointment
            </Link>
            <Link
              href="/app/formulas/new"
              className="rounded-full border border-emerald-500/60 px-4 py-2 text-sm text-emerald-200"
            >
              New Formula
            </Link>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Clients", value: clients.length },
            { label: "Appointments", value: appointments.length },
            {
              label: "Upcoming",
              value: upcomingAppointments.length,
            },
            { label: "Formulas", value: formulas.length },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            This Week
          </p>
          <h3 className="text-xl font-semibold">Upcoming schedule</h3>
          <p className="text-slate-300">
            {weekAppointments.length} appointment{weekAppointments.length === 1 ? "" : "s"} scheduled in the next 7 days.
          </p>
        </div>
        <div className="mt-6 space-y-3">
          {upcomingAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
              No upcoming appointments yet.
            </div>
          ) : (
            upcomingAppointments.map((appointment) => {
              const client = clientMap.get(appointment.clientId);
              return (
                <div
                  key={appointment.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-100">
                      {client ? getClientDisplayName(client) : "Unknown client"}
                    </p>
                    <p className="text-slate-400">{appointment.serviceName}</p>
                  </div>
                  <div className="text-slate-300">
                    {new Date(appointment.startAt).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent clients</h3>
            <Link href="/app/clients" className="text-sm text-emerald-200">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentClients.length === 0 ? (
              <p className="text-sm text-slate-400">No clients yet.</p>
            ) : (
              recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/app/clients/${client.id}`}
                  className="block rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-slate-100">
                    {getClientDisplayName(client)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Updated {new Date(client.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent formulas</h3>
            <Link href="/app/formulas" className="text-sm text-emerald-200">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentFormulas.length === 0 ? (
              <p className="text-sm text-slate-400">No formulas yet.</p>
            ) : (
              recentFormulas.map((formula) => {
                const client = clientMap.get(formula.clientId);
                return (
                  <Link
                    key={formula.id}
                    href={`/app/formulas/${formula.id}`}
                    className="block rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    <p className="font-semibold text-slate-100">
                      {formula.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {client ? getClientDisplayName(client) : "Unknown client"} • {formula.serviceType}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Local AI Sandbox</h3>
          <p className="text-slate-300">
            Run deterministic embedded AI tasks to verify client-side
            integrations before wiring external providers.
          </p>
        </div>
        <div className="mt-6">
          <EmbeddedAiDemo enabled={flags.EMBEDDED_AI_ENABLED} />
        </div>
      </section>
    </div>
  );
}
