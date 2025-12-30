"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Appointment, AppointmentStatus, Client } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { formatDbError, isDbConfigured } from "@/lib/db/health";
import { getClients } from "@/lib/storage";

const buildEmptyAppointment = (): Appointment => ({
  id: "",
  clientId: "",
  serviceName: "",
  startAt: new Date().toISOString(),
  durationMin: 60,
  status: "scheduled",
  notes: "",
  createdAt: "",
  updatedAt: "",
});

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function NewAppointmentPage() {
  const router = useRouter();
  const [form, setForm] = useState<Appointment>(buildEmptyAppointment());
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dbConfigured = isDbConfigured();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!dbConfigured) {
        setClients(getClients());
        return;
      }
      try {
        const res = await fetch("/api/db/clients");
        const json = (await res.json()) as {
          ok: boolean;
          data?: Client[];
          error?: string;
        };
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Client fetch failed.");
        }
        if (active) {
          setClients(json.data ?? []);
        }
      } catch (err) {
        const message = formatDbError(err);
        setError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
        }
        setClients(getClients());
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

  const handleChange = (
    field: keyof Appointment,
    value: string | number | AppointmentStatus
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.clientId || !form.serviceName.trim()) return;

    if (!dbConfigured) {
      setError("Connect DB to enable saves.");
      return;
    }

    try {
      const res = await fetch("/api/db/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          serviceName: form.serviceName,
          startAt: form.startAt,
          durationMin: form.durationMin,
          status: form.status,
          notes: form.notes,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: Appointment;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "Unable to save appointment.");
      }
      router.push(`/app/appointments/${json.data.id}`);
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
        <h2 className="text-2xl font-semibold">New appointment</h2>
        <p className="text-slate-300">Schedule a session locally.</p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-200">
          <p>No clients yet. Add a client before scheduling appointments.</p>
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
            Service name
            <input
              value={form.serviceName}
              onChange={(event) =>
                handleChange("serviceName", event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Signature Glow Facial"
              required
            />
          </label>
          <label className="block text-sm text-slate-200">
            Date & time
            <input
              type="datetime-local"
              value={toLocalInput(form.startAt)}
              onChange={(event) =>
                handleChange(
                  "startAt",
                  new Date(event.target.value).toISOString()
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Duration (min)
            <input
              type="number"
              min={15}
              value={form.durationMin}
              onChange={(event) =>
                handleChange("durationMin", Number(event.target.value))
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                handleChange("status", event.target.value as AppointmentStatus)
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm text-slate-200">
          Notes
          <textarea
            value={form.notes}
            onChange={(event) => handleChange("notes", event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            rows={4}
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/app/appointments")}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={clients.length === 0}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            title={dbConfigured ? "Save appointment" : "Connect DB to enable saves"}
          >
            Save appointment
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-rose-200">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
