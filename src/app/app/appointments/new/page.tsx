"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Appointment, AppointmentStatus, Client } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { formatDbError } from "@/lib/db/health";
import { useRepo } from "@/lib/repo";

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
  const repo = useRepo();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (active) {
          setClients(await repo.getClients());
        }
      } catch (err) {
        const message = formatDbError(err);
        setError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
        }
        setClients(await repo.getClients());
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

  const handleChange = (
    field: keyof Appointment,
    value: string | number | AppointmentStatus
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.clientId || !form.serviceName.trim()) return;

    try {
      const saved = await repo.upsertAppointment(form);
      router.push(`/app/appointments/${saved.id}`);
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
        <p className="text-muted-foreground">Schedule a session locally.</p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-100/60 p-6 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <p>No clients yet. Add a client before scheduling appointments.</p>
          <Link
            href="/app/clients/new"
            className="mt-3 inline-flex rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 dark:border-amber-200 dark:text-amber-100"
          >
            Add a client
          </Link>
        </div>
      ) : null}

      <form
        className="rounded-2xl border border-border bg-card/70 p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-foreground">
            Client
            <select
              value={form.clientId}
              onChange={(event) => handleChange("clientId", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
          <label className="block text-sm text-foreground">
            Service name
            <input
              value={form.serviceName}
              onChange={(event) =>
                handleChange("serviceName", event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Signature Glow Facial"
              required
            />
          </label>
          <label className="block text-sm text-foreground">
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
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-foreground">
            Duration (min)
            <input
              type="number"
              min={15}
              value={form.durationMin}
              onChange={(event) =>
                handleChange("durationMin", Number(event.target.value))
              }
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-foreground">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                handleChange("status", event.target.value as AppointmentStatus)
              }
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm text-foreground">
          Notes
          <textarea
            value={form.notes}
            onChange={(event) => handleChange("notes", event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={4}
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/app/appointments")}
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={clients.length === 0}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold op-on-accent disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            title="Save appointment"
          >
            Save appointment
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
