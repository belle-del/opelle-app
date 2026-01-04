"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Appointment, AppointmentStatus, Client } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { formatDbError } from "@/lib/db/health";
import { useRepo } from "@/lib/repo";

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const repo = useRepo();
  const canWrite = !dbError;

  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    const load = async () => {
      try {
        if (active) {
          const [appointmentData, clientsData] = await Promise.all([
            repo.getAppointmentById(params.id),
            repo.getClients(),
          ]);
          setAppointment(appointmentData);
          setClients(clientsData);
        }
      } catch (error) {
        const message = formatDbError(error);
        setDbError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
        }
        const [appointmentData, clientsData] = await Promise.all([
          repo.getAppointmentById(params.id),
          repo.getClients(),
        ]);
        setAppointment(appointmentData);
        setClients(clientsData);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [params?.id, repo]);

  const client = useMemo(() => {
    if (!appointment) return null;
    return clients.find((item) => item.id === appointment.clientId) ?? null;
  }, [appointment, clients]);

  if (!appointment) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Appointment not found</h2>
        <Link href="/app/appointments" className="text-sm text-emerald-600 dark:text-emerald-200">
          Back to appointments
        </Link>
      </div>
    );
  }

  const handleChange = (
    field: keyof Appointment,
    value: string | number | AppointmentStatus
  ) => {
    setAppointment((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!appointment.clientId || !appointment.serviceName.trim()) return;

    if (!canWrite) return;
    try {
      const saved = await repo.upsertAppointment(appointment);
      setAppointment(saved);
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
    if (!confirm("Delete this appointment?")) return;
    if (!canWrite) return;
    try {
      await repo.deleteAppointment(appointment.id);
      router.push("/app/appointments");
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
          <h2 className="text-2xl font-semibold">Appointment</h2>
          <p className="text-muted-foreground">Details stored locally.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/appointments"
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
          >
            Back to appointments
          </Link>
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="rounded-full border border-emerald-500/60 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-200"
          >
            {isEditing ? "Cancel edit" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <form
          className="rounded-2xl border border-border bg-card/70 p-6"
          onSubmit={handleSave}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-foreground">
              Client
              <select
                value={appointment.clientId}
                onChange={(event) =>
                  handleChange("clientId", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
            <label className="block text-sm text-foreground">
              Service name
              <input
                value={appointment.serviceName}
                onChange={(event) =>
                  handleChange("serviceName", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm text-foreground">
              Date & time
              <input
                type="datetime-local"
                value={toLocalInput(appointment.startAt)}
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
                value={appointment.durationMin}
                onChange={(event) =>
                  handleChange("durationMin", Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-foreground">
              Status
              <select
                value={appointment.status}
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
              value={appointment.notes ?? ""}
              onChange={(event) => handleChange("notes", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={4}
            />
          </label>
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full border border-rose-500/60 px-4 py-2 text-sm text-rose-600 dark:text-rose-300"
              disabled={!canWrite}
              title={canWrite ? "Delete appointment" : "Connect DB to enable deletes"}
            >
              Delete appointment
            </button>
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold op-on-accent"
              disabled={!canWrite}
              title={canWrite ? "Save changes" : "Connect DB to enable saves"}
            >
              Save changes
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-border bg-card/70 p-6 text-sm text-foreground">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Client
              </p>
              <p className="mt-2">
                {client ? getClientDisplayName(client) : "Unknown client"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Service
              </p>
              <p className="mt-2">{appointment.serviceName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Time
              </p>
              <p className="mt-2">
                {new Date(appointment.startAt).toLocaleString()}
              </p>
              <p>{appointment.durationMin} min</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Status
              </p>
              <p className="mt-2 capitalize">{appointment.status}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Notes
            </p>
            <p className="mt-2 text-muted-foreground">
              {appointment.notes || "No notes yet."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
