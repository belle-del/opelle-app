"use client";

import { useEffect, useMemo, useState } from "react";
import EmbeddedAiDemo from "./embedded-ai-demo";
import { flags } from "@/lib/flags";
import { getAppointments, getClients, listFormulas } from "@/lib/storage";

export default function AppDashboardPage() {
  const [clientsCount, setClientsCount] = useState(0);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [formulasCount, setFormulasCount] = useState(0);

  useEffect(() => {
    const clients = getClients();
    const appointments = getAppointments();
    const formulas = listFormulas();
    const now = new Date().toISOString();

    setClientsCount(clients.length);
    setAppointmentsCount(appointments.length);
    setUpcomingCount(
      appointments.filter(
        (appointment) =>
          appointment.startAt >= now && appointment.status !== "cancelled"
      ).length
    );
    setFormulasCount(formulas.length);
  }, []);

  const nextSteps = useMemo(() => {
    if (clientsCount === 0) {
      return [
        "Add your first client to unlock appointments and formulas.",
        "Create a sample appointment to preview the schedule view.",
        "Document a formula from your last service.",
      ];
    }

    return [
      `Review ${upcomingCount} upcoming appointment${
        upcomingCount === 1 ? "" : "s"
      } for the week ahead.`,
      `Update notes for ${clientsCount} active client${
        clientsCount === 1 ? "" : "s"
      } to keep care plans fresh.`,
      `Log formula adjustments (${formulasCount} saved).`,
    ];
  }, [clientsCount, formulasCount, upcomingCount]);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Today
          </p>
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="text-slate-300">
            Your console is running locally with mock data and local storage.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Clients", value: clientsCount },
            { label: "Appointments", value: appointmentsCount },
            { label: "Upcoming", value: upcomingCount },
            { label: "Formulas", value: formulasCount },
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
          <h3 className="text-xl font-semibold">Next steps</h3>
          <p className="text-slate-300">
            Quick actions to keep the studio moving forward.
          </p>
        </div>
        <div className="mt-6 space-y-3">
          {nextSteps.map((step) => (
            <div
              key={step}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200"
            >
              {step}
            </div>
          ))}
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
