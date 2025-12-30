"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Formula, FormulaServiceType, Client, Appointment } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { formatDbError, isDbConfigured } from "@/lib/db/health";
import { getAppointments, getClients, getFormulas } from "@/lib/storage";

const filterOptions = ["all", "color", "lighten", "tone", "gloss", "other"] as const;

type Filter = (typeof filterOptions)[number];

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const dbConfigured = isDbConfigured();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!dbConfigured) {
        setFormulas(getFormulas());
        setClients(getClients());
        setAppointments(getAppointments());
        return;
      }
      try {
        const [formulaRes, clientRes, apptRes] = await Promise.all([
          fetch("/api/db/formulas"),
          fetch("/api/db/clients"),
          fetch("/api/db/appointments"),
        ]);
        const formulaJson = (await formulaRes.json()) as {
          ok: boolean;
          data?: Formula[];
          error?: string;
        };
        const clientJson = (await clientRes.json()) as {
          ok: boolean;
          data?: Client[];
          error?: string;
        };
        const apptJson = (await apptRes.json()) as {
          ok: boolean;
          data?: Appointment[];
          error?: string;
        };
        if (!formulaRes.ok || !formulaJson.ok) {
          throw new Error(formulaJson.error || "Formulas fetch failed");
        }
        if (!clientRes.ok || !clientJson.ok) {
          throw new Error(clientJson.error || "Clients fetch failed");
        }
        if (!apptRes.ok || !apptJson.ok) {
          throw new Error(apptJson.error || "Appointments fetch failed");
        }
        if (active) {
          setFormulas(formulaJson.data ?? []);
          setClients(clientJson.data ?? []);
          setAppointments(apptJson.data ?? []);
        }
      } catch (error) {
        const message = formatDbError(error);
        setDbError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("opelle:db-error", { detail: message })
          );
        }
        setFormulas(getFormulas());
        setClients(getClients());
        setAppointments(getAppointments());
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [dbConfigured]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("clientId");
    if (clientId) {
      setClientFilter(clientId);
    }
  }, []);

  const clientMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const appointmentMap = useMemo(() => {
    return new Map(appointments.map((appt) => [appt.id, appt]));
  }, [appointments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return formulas.filter((formula) => {
      if (filter !== "all" && formula.serviceType !== filter) {
        return false;
      }
      if (clientFilter && formula.clientId !== clientFilter) {
        return false;
      }

      if (!term) return true;

      const clientName = clientMap.has(formula.clientId)
        ? getClientDisplayName(clientMap.get(formula.clientId)!)
        : "unknown client";

      const stepText = formula.steps
        .map((step) => step.product)
        .join(" ")
        .toLowerCase();

      return [formula.title, formula.colorLine ?? "", clientName, stepText]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [clientFilter, clientMap, filter, formulas, search]);

  const filterLabel = (value: Filter) => {
    if (value === "all") return "All";
    if (value === "color") return "Color";
    if (value === "lighten") return "Lighten";
    if (value === "tone") return "Tone";
    if (value === "gloss") return "Gloss";
    return "Other";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Formulas</h2>
          <p className="text-slate-300">
            Track formulas and color recipes stored locally.
          </p>
        </div>
        <Link
          href={clientFilter ? `/app/formulas/new?clientId=${clientFilter}` : "/app/formulas/new"}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          New Formula
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
            {filterLabel(value)}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200"
        placeholder="Search by title, client, color line, or product"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            No formulas yet. Add a formula to start building your recipe library.
          </div>
        ) : (
          filtered.map((formula) => {
            const client = clientMap.get(formula.clientId);
            const appointment = formula.appointmentId
              ? appointmentMap.get(formula.appointmentId)
              : undefined;

            return (
              <div
                key={formula.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/app/formulas/${formula.id}`}
                      className="text-lg font-semibold text-slate-100 transition hover:text-emerald-200"
                    >
                      {formula.title}
                    </Link>
                    <div className="text-sm text-slate-400">
                      {client ? (
                        <Link
                          href={`/app/clients/${client.id}`}
                          className="transition hover:text-emerald-200"
                        >
                          {getClientDisplayName(client)}
                        </Link>
                      ) : (
                        "Unknown client"
                      )}
                    </div>
                    {formula.colorLine ? (
                      <p className="text-xs text-slate-500">
                        {formula.colorLine}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <p className="capitalize">{formula.serviceType}</p>
                    <p>Updated {new Date(formula.updatedAt).toLocaleDateString()}</p>
                    {appointment ? (
                      <p className="text-xs text-slate-500">
                        Appt {new Date(appointment.startAt).toLocaleDateString()}
                      </p>
                    ) : null}
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
