"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  Appointment,
  Client,
  Formula,
  FormulaServiceType,
  FormulaStep,
} from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { formatDbError, isDbConfigured } from "@/lib/db/health";
import {
  getAppointments,
  getClients,
  getFormulaById,
} from "@/lib/storage";

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

export default function FormulaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [formula, setFormula] = useState<Formula | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const dbConfigured = isDbConfigured();
  const canWrite = dbConfigured && !dbError;

  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    const load = async () => {
      if (!dbConfigured) {
        setFormula(getFormulaById(params.id));
        setClients(getClients());
        setAppointments(getAppointments());
        return;
      }
      try {
        const [formulaRes, clientRes, apptRes] = await Promise.all([
          fetch(`/api/db/formulas/${params.id}`),
          fetch("/api/db/clients"),
          fetch("/api/db/appointments"),
        ]);
        const formulaJson = (await formulaRes.json()) as {
          ok: boolean;
          data?: Formula | null;
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
          throw new Error(formulaJson.error || "Formula fetch failed");
        }
        if (!clientRes.ok || !clientJson.ok) {
          throw new Error(clientJson.error || "Clients fetch failed");
        }
        if (!apptRes.ok || !apptJson.ok) {
          throw new Error(apptJson.error || "Appointments fetch failed");
        }
        if (active) {
          setFormula(formulaJson.data ?? null);
          setClients(clientJson.data ?? []);
          setAppointments(apptJson.data ?? []);
        }
      } catch (error) {
        const message = formatDbError(error);
        setDbError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
        }
        setFormula(getFormulaById(params.id));
        setClients(getClients());
        setAppointments(getAppointments());
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [dbConfigured, params?.id]);

  const client = useMemo(() => {
    if (!formula) return null;
    return clients.find((item) => item.id === formula.clientId) ?? null;
  }, [formula, clients]);

  const appointment = useMemo(() => {
    if (!formula?.appointmentId) return undefined;
    return appointments.find((appt) => appt.id === formula.appointmentId);
  }, [appointments, formula]);

  if (!formula) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Formula not found</h2>
        <Link href="/app/formulas" className="text-sm text-emerald-200">
          Back to formulas
        </Link>
      </div>
    );
  }

  const handleChange = (
    field: keyof Formula,
    value: string | FormulaServiceType
  ) => {
    setFormula((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleStepChange = (
    index: number,
    field: keyof FormulaStep,
    value: string | number | undefined
  ) => {
    setFormula((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.slice();
      steps[index] = { ...steps[index], [field]: value };
      return { ...prev, steps };
    });
  };

  const handleAddStep = () => {
    setFormula((prev) => (prev ? { ...prev, steps: [...prev.steps, buildStep()] } : prev));
  };

  const handleRemoveStep = (index: number) => {
    setFormula((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.filter((_, idx) => idx !== index) };
    });
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formula.clientId || !formula.title.trim()) return;

    if (!canWrite) return;
    try {
      const res = await fetch(`/api/db/formulas/${formula.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formula.clientId,
          serviceType: formula.serviceType,
          title: formula.title,
          colorLine: formula.colorLine,
          appointmentId: formula.appointmentId,
          notes: formula.notes,
          steps: formula.steps.map((step, index) => ({
            stepName: step.stepName?.trim() || `Step ${index + 1}`,
            product: step.product?.trim() || "",
            developer: step.developer?.trim() || undefined,
            ratio: step.ratio?.trim() || undefined,
            grams: step.grams ?? undefined,
            processingMin: step.processingMin ?? undefined,
            notes: step.notes?.trim() || undefined,
          })),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: Formula;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "Update failed.");
      }
      setFormula(json.data);
      setIsEditing(false);
    } catch (error) {
      const message = formatDbError(error);
      setDbError(message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this formula?")) return;
    if (!canWrite) return;
    try {
      const res = await fetch(`/api/db/formulas/${formula.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Delete failed.");
      }
      router.push("/app/formulas");
    } catch (error) {
      const message = formatDbError(error);
      setDbError(message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{formula.title}</h2>
          <p className="text-slate-300">Formula stored locally.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/formulas"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Back to formulas
          </Link>
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="rounded-full border border-emerald-500/60 px-4 py-2 text-sm text-emerald-200"
          >
            {isEditing ? "Cancel edit" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <form
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
          onSubmit={handleSave}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-200">
              Client
              <select
                value={formula.clientId}
                onChange={(event) => handleChange("clientId", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                required
              >
                <option value="">Select client</option>
                {clients.map((clientOption) => (
                  <option key={clientOption.id} value={clientOption.id}>
                    {getClientDisplayName(clientOption)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-200">
              Service type
              <select
                value={formula.serviceType}
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
                value={formula.title}
                onChange={(event) => handleChange("title", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm text-slate-200">
              Color line
              <input
                value={formula.colorLine ?? ""}
                onChange={(event) => handleChange("colorLine", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Link to appointment
              <select
                value={formula.appointmentId ?? ""}
                onChange={(event) => handleChange("appointmentId", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">No appointment</option>
                {appointments
                  .filter((appt) => appt.clientId === formula.clientId)
                  .map((appt) => (
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

            {formula.steps.map((step, index) => (
              <div
                key={`step-${index}`}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">
                    Step {index + 1}
                  </p>
                  {formula.steps.length > 1 ? (
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

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full border border-rose-500/60 px-4 py-2 text-sm text-rose-200"
              disabled={!canWrite}
              title={canWrite ? "Delete formula" : "Connect DB to enable deletes"}
            >
              Delete formula
            </button>
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
              disabled={!canWrite}
              title={canWrite ? "Save changes" : "Connect DB to enable saves"}
            >
              Save changes
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Client
                </p>
                <p className="mt-2">
                  {client ? getClientDisplayName(client) : "Unknown client"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Service type
                </p>
                <p className="mt-2 capitalize">{formula.serviceType}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Color line
                </p>
                <p className="mt-2">{formula.colorLine || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Appointment
                </p>
                <p className="mt-2">
                  {appointment
                    ? new Date(appointment.startAt).toLocaleDateString()
                    : "Not linked"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {formula.steps.map((step, index) => (
              <div
                key={`recipe-${index}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-100">
                      {step.stepName || `Step ${index + 1}`}
                    </p>
                    <p className="text-sm text-slate-400">{step.product}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {step.processingMin ? (
                      <p>{step.processingMin} min</p>
                    ) : null}
                    {step.grams ? <p>{step.grams} g</p> : null}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                  {step.developer ? <p>Developer: {step.developer}</p> : null}
                  {step.ratio ? <p>Ratio: {step.ratio}</p> : null}
                </div>
                {step.notes ? (
                  <p className="mt-3 text-sm text-slate-400">
                    Notes: {step.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
