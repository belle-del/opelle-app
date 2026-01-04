"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Formula, FormulaServiceType, Client, Appointment } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { formatDbError } from "@/lib/db/health";
import { useRepo } from "@/lib/repo";

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
  const repo = useRepo();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (active) {
          const [formulasData, clientsData, appointmentsData] =
            await Promise.all([
              repo.getFormulas(),
              repo.getClients(),
              repo.getAppointments(),
            ]);
          setFormulas(formulasData);
          setClients(clientsData);
          setAppointments(appointmentsData);
        }
      } catch (error) {
        const message = formatDbError(error);
        setDbError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("opelle:db-error", { detail: message })
          );
        }
        const [formulasData, clientsData, appointmentsData] =
          await Promise.all([
            repo.getFormulas(),
            repo.getClients(),
            repo.getAppointments(),
          ]);
        setFormulas(formulasData);
        setClients(clientsData);
        setAppointments(appointmentsData);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [repo]);

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
          <p className="text-muted-foreground">
            Track formulas and color recipes stored locally.
          </p>
        </div>
        <Link
          href={clientFilter ? `/app/formulas/new?clientId=${clientFilter}` : "/app/formulas/new"}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold op-on-accent transition hover:bg-emerald-300"
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
                ? "bg-muted text-foreground"
                : "border border-border text-foreground"
            }`}
          >
            {filterLabel(value)}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
        placeholder="Search by title, client, color line, or product"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted-foreground">
            <p>
              No formulas yet. Add your first formula to build the recipe
              library.
            </p>
            <Link
              href="/app/formulas/new"
              className="mt-4 inline-flex rounded-full border border-emerald-500/60 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-200"
            >
              Create first formula
            </Link>
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
                className="rounded-2xl border border-border bg-card/70 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/app/formulas/${formula.id}`}
                      className="text-lg font-semibold text-foreground transition hover:text-emerald-600 dark:text-emerald-200"
                    >
                      {formula.title}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {client ? (
                        <Link
                          href={`/app/clients/${client.id}`}
                          className="transition hover:text-emerald-600 dark:text-emerald-200"
                        >
                          {getClientDisplayName(client)}
                        </Link>
                      ) : (
                        "Unknown client"
                      )}
                    </div>
                    {formula.colorLine ? (
                      <p className="text-xs text-muted-foreground">
                        {formula.colorLine}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p className="capitalize">{formula.serviceType}</p>
                    <p>Updated {new Date(formula.updatedAt).toLocaleDateString()}</p>
                    {appointment ? (
                      <p className="text-xs text-muted-foreground">
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
