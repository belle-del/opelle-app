"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  Client,
} from "@/lib/models";
import {
  deleteAppointment,
  listAppointments,
  listClients,
  saveAppointment,
} from "@/lib/storage";
import Modal from "@/app/app/_components/Modal";

const emptyForm: AppointmentInput = {
  clientId: undefined,
  clientName: "",
  service: "",
  startAt: new Date().toISOString(),
  durationMinutes: 60,
  status: "scheduled",
  notes: "",
};

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<AppointmentInput>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const searchParams = useSearchParams();

  const refreshData = () => {
    setAppointments(listAppointments());
    setClients(listClients());
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setForm(emptyForm);
      setModalOpen(true);
    }
  }, [searchParams]);

  const handleChange = (
    field: keyof AppointmentInput,
    value: string | number | undefined
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.clientName.trim() || !form.service.trim()) return;

    saveAppointment({
      ...form,
      clientName: form.clientName.trim(),
      service: form.service.trim(),
      notes: form.notes?.trim() || undefined,
    });
    refreshData();
    setModalOpen(false);
    setForm(emptyForm);
  };

  const handleEdit = (appointment: Appointment) => {
    setForm({
      id: appointment.id,
      clientId: appointment.clientId,
      clientName: appointment.clientName,
      service: appointment.service,
      startAt: appointment.startAt,
      durationMinutes: appointment.durationMinutes,
      status: appointment.status,
      notes: appointment.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleDelete = (appointmentId: string) => {
    if (!confirm("Delete this appointment?")) return;
    deleteAppointment(appointmentId);
    refreshData();
  };

  const filteredAppointments = useMemo(() => {
    const now = new Date().toISOString();
    return appointments.filter((appointment) =>
      filter === "upcoming"
        ? appointment.startAt >= now
        : appointment.startAt < now
    );
  }, [appointments, filter]);

  const statusTone = (status: AppointmentStatus) => {
    if (status === "completed") return "text-emerald-200";
    if (status === "canceled") return "text-rose-200";
    return "text-amber-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Appointments</h2>
          <p className="text-slate-300">
            Schedule sessions and track upcoming vs past visits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            setModalOpen(true);
          }}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          New appointment
        </button>
      </div>

      <div className="flex gap-2">
        {(["upcoming", "past"] as const).map((value) => (
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
            {value === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            No appointments in this view yet.
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-100">
                    {appointment.clientName}
                  </p>
                  <p className="text-sm text-slate-400">
                    {appointment.service}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-300">
                  <p>{new Date(appointment.startAt).toLocaleString()}</p>
                  <p>{appointment.durationMinutes} min</p>
                  <p className={statusTone(appointment.status)}>
                    {appointment.status}
                  </p>
                </div>
              </div>
              {appointment.notes ? (
                <p className="mt-3 text-sm text-slate-400">
                  Notes: {appointment.notes}
                </p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(appointment)}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(appointment.id)}
                  className="rounded-full border border-rose-500/60 px-3 py-1 text-xs text-rose-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        title={form.id ? "Edit appointment" : "New appointment"}
        onClose={() => setModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-200">
            Client
            <select
              value={form.clientId ?? ""}
              onChange={(event) => {
                const client = clients.find(
                  (item) => item.id === event.target.value
                );
                handleChange("clientId", event.target.value || undefined);
                handleChange("clientName", client?.name ?? "");
              }}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Select client (or type below)</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-200">
            Client name
            <input
              value={form.clientName}
              onChange={(event) => handleChange("clientName", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Client name"
              required
            />
          </label>
          <label className="block text-sm text-slate-200">
            Service
            <input
              value={form.service}
              onChange={(event) => handleChange("service", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Signature Glow Facial"
              required
            />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
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
                value={form.durationMinutes}
                onChange={(event) =>
                  handleChange("durationMinutes", Number(event.target.value))
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
                <option value="canceled">Canceled</option>
              </select>
            </label>
          </div>
          <label className="block text-sm text-slate-200">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              rows={3}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Save appointment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
