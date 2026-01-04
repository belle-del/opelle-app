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

  const educationModulesCount = 6;
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

  const recentActivity = useMemo(() => {
    const activity = [
      ...clients.map((client) => ({
        id: client.id,
        label: `Client • ${getClientDisplayName(client)}`,
        date: client.updatedAt,
        href: `/app/clients/${client.id}`,
      })),
      ...appointments.map((appointment) => ({
        id: appointment.id,
        label: `Appointment • ${appointment.serviceName}`,
        date: appointment.updatedAt,
        href: `/app/appointments/${appointment.id}`,
      })),
      ...formulas.map((formula) => ({
        id: formula.id,
        label: `Formula • ${formula.title}`,
        date: formula.updatedAt,
        href: `/app/formulas/${formula.id}`,
      })),
    ];
    return activity
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [appointments, clients, formulas]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Student Console
        </p>
        <h2 className="text-3xl font-semibold">Command Center</h2>
        <p className="text-slate-300">
          Track client activity, upcoming appointments, and formulas at a
          glance.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Clients", value: clients.length },
          { label: "Appointments (upcoming)", value: upcomingAppointments.length },
          { label: "Formulas", value: formulas.length },
          { label: "Education modules", value: educationModulesCount },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-100">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Quick actions</h3>
            <p className="text-sm text-slate-400">
              Create new records in a single click.
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
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Recent activity</h3>
            <p className="text-sm text-slate-400">
              The latest client, appointment, and formula updates.
            </p>
          </div>
          <Link href="/app/clients" className="text-sm text-emerald-200">
            View clients
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
              No activity yet. Add your first client to start building history.
            </div>
          ) : (
            recentActivity.map((item) => (
              <Link
                key={`${item.id}-${item.label}`}
                href={item.href}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-slate-100">
                  {item.label}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(item.date).toLocaleDateString()}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            This Week
          </p>
          <h3 className="text-xl font-semibold">Upcoming schedule</h3>
          <p className="text-slate-300">
            {weekAppointments.length} appointment
            {weekAppointments.length === 1 ? "" : "s"} scheduled in the next 7
            days.
          </p>
        </div>
        <div className="mt-6 space-y-3">
          {upcomingAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
              No upcoming appointments yet. Schedule one to fill your calendar.
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
