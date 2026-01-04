"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  Appointment,
  Client,
  Formula,
  FormulaServiceType,
  FormulaStep,
} from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { formatDbError } from "@/lib/db/health";
import { useRepo } from "@/lib/repo";

const serviceTypes: FormulaServiceType[] = [
  "color",
  "lighten",
  "tone",
  "gloss",
  "other",
];

const buildStep = (): FormulaStep => ({
  stepName: "",
  product: "",
  developer: "",
  ratio: "",
  grams: undefined,
  processingMin: undefined,
  notes: "",
});

const buildEmptyFormula = (): Formula => ({
  id: "",
  clientId: "",
  serviceType: "color",
  title: "",
  colorLine: "",
  steps: [buildStep()],
  appointmentId: undefined,
  createdAt: "",
  updatedAt: "",
});

export default function NewFormulaPage() {
  const router = useRouter();
  const [form, setForm] = useState<Formula>(buildEmptyFormula());
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const repo = useRepo();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (active) {
          const [clientsData, appointmentsData] = await Promise.all([
            repo.getClients(),
            repo.getAppointments(),
          ]);
          setClients(clientsData);
          setAppointments(appointmentsData);
        }
      } catch (err) {
        const message = formatDbError(err);
        setError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
        }
        const [clientsData, appointmentsData] = await Promise.all([
          repo.getClients(),
          repo.getAppointments(),
        ]);
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
      setForm((prev) => ({ ...prev, clientId }));
    }
  }, []);

  useEffect(() => {
    if (!form.clientId) return;
    const exists = clients.some((client) => client.id === form.clientId);
    if (!exists) {
      setForm((prev) => ({ ...prev, clientId: "" }));
    }
  }, [clients, form.clientId]);

  const filteredAppointments = useMemo(() => {
    if (!form.clientId) return [];
    return appointments.filter((appt) => appt.clientId === form.clientId);
  }, [appointments, form.clientId]);

  const handleChange = (
    field: keyof Formula,
    value: string | FormulaServiceType
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStepChange = (
    index: number,
    field: keyof FormulaStep,
    value: string | number | undefined
  ) => {
    setForm((prev) => {
      const steps = prev.steps.slice();
      steps[index] = { ...steps[index], [field]: value };
      return { ...prev, steps };
    });
  };

  const handleAddStep = () => {
    setForm((prev) => ({ ...prev, steps: [...prev.steps, buildStep()] }));
  };

  const handleRemoveStep = (index: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, stepIndex) => stepIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.clientId || !form.title.trim()) return;

    try {
      const saved = await repo.upsertFormula(form);
      router.push(`/app/formulas/${saved.id}`);
    } catch (err) {
      const message = formatDbError(err);
      setError(message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">New formula</h2>
        <p className="text-slate-300">Add a recipe to local storage.</p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-200">
          <p>No clients yet. Add a client before creating a formula.</p>
          <Link
            href="/app/clients/new"
            className="mt-3 inline-flex rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-100"
          >
            Add a client
          </Link>
        </div>
      ) : null}

      <form
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-200">
            Client
            <select
              value={form.clientId}
              onChange={(event) => handleChange("clientId", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              required
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {getClientDisplayName(client)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-200">
            Service type
            <select
              value={form.serviceType}
              onChange={(event) =>
                handleChange("serviceType", event.target.value as FormulaServiceType)
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-200">
            Title
            <input
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Root touch-up + gloss"
              required
            />
          </label>
          <label className="block text-sm text-slate-200">
            Color line
            <input
              value={form.colorLine}
              onChange={(event) => handleChange("colorLine", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Redken Shades EQ"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Link to appointment
            <select
              value={form.appointmentId ?? ""}
              onChange={(event) =>
                handleChange("appointmentId", event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">No appointment</option>
              {filteredAppointments.map((appt) => (
                <option key={appt.id} value={appt.id}>
                  {new Date(appt.startAt).toLocaleDateString()} • {appt.serviceName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Steps</h3>
            <button
              type="button"
              onClick={handleAddStep}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
            >
              Add step
            </button>
          </div>

          {form.steps.map((step, index) => (
            <div
              key={`step-${index}`}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200">
                  Step {index + 1}
                </p>
                {form.steps.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    className="text-xs text-rose-200"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-slate-200">
                  Step name
                  <input
                    value={step.stepName}
                    onChange={(event) =>
                      handleStepChange(index, "stepName", event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="Roots"
                  />
                </label>
                <label className="block text-sm text-slate-200">
                  Product
                  <input
                    value={step.product}
                    onChange={(event) =>
                      handleStepChange(index, "product", event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="7N + 7G"
                    required
                  />
                </label>
                <label className="block text-sm text-slate-200">
                  Developer
                  <input
                    value={step.developer ?? ""}
                    onChange={(event) =>
                      handleStepChange(index, "developer", event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="10 vol"
                  />
                </label>
                <label className="block text-sm text-slate-200">
                  Ratio
                  <input
                    value={step.ratio ?? ""}
                    onChange={(event) =>
                      handleStepChange(index, "ratio", event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="1:1"
                  />
                </label>
                <label className="block text-sm text-slate-200">
                  Grams
                  <input
                    type="number"
                    min={0}
                    value={step.grams ?? ""}
                    onChange={(event) =>
                      handleStepChange(
                        index,
                        "grams",
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm text-slate-200">
                  Processing (min)
                  <input
                    type="number"
                    min={0}
                    value={step.processingMin ?? ""}
                    onChange={(event) =>
                      handleStepChange(
                        index,
                        "processingMin",
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="mt-3 block text-sm text-slate-200">
                Notes
                <textarea
                  value={step.notes ?? ""}
                  onChange={(event) =>
                    handleStepChange(index, "notes", event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  rows={2}
                />
              </label>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/app/formulas")}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={clients.length === 0}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            title="Save formula"
          >
            Save formula
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-rose-200">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
