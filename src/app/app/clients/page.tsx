"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Client, ClientInput } from "@/lib/models";
import { deleteClient, listClients, saveClient } from "@/lib/storage";
import Modal from "@/app/app/_components/Modal";

const emptyForm: ClientInput = {
  name: "",
  pronouns: "",
  phone: "",
  email: "",
  notes: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const searchParams = useSearchParams();

  const refreshClients = () => {
    setClients(listClients());
  };

  useEffect(() => {
    refreshClients();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setForm(emptyForm);
      setModalOpen(true);
    }
  }, [searchParams]);

  const handleChange = (
    field: keyof ClientInput,
    value: string | undefined
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    saveClient({
      ...form,
      name: form.name.trim(),
      pronouns: form.pronouns?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    });
    refreshClients();
    setModalOpen(false);
    setForm(emptyForm);
  };

  const handleEdit = (client: Client) => {
    setForm({
      id: client.id,
      name: client.name,
      pronouns: client.pronouns ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      notes: client.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleDelete = (clientId: string) => {
    if (!confirm("Delete this client?")) return;
    deleteClient(clientId);
    refreshClients();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Clients</h2>
          <p className="text-slate-300">
            Manage client profiles stored locally in this browser.
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
          Add client
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            No clients yet. Add one to start building appointments and formulas.
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/app/clients/${client.id}`}
                    className="text-lg font-semibold text-slate-100 transition hover:text-emerald-200"
                  >
                    {client.name}
                  </Link>
                  {client.pronouns ? (
                    <p className="text-sm text-slate-400">
                      Pronouns: {client.pronouns}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(client)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(client.id)}
                    className="rounded-full border border-rose-500/60 px-3 py-1 text-xs text-rose-200 hover:border-rose-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-300">
                {client.phone ? <p>Phone: {client.phone}</p> : null}
                {client.email ? <p>Email: {client.email}</p> : null}
                {client.notes ? (
                  <p className="text-slate-400">Notes: {client.notes}</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        title={form.id ? "Edit client" : "Add client"}
        onClose={() => setModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-200">
            Name
            <input
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Client name"
              required
            />
          </label>
          <label className="block text-sm text-slate-200">
            Pronouns
            <input
              value={form.pronouns}
              onChange={(event) => handleChange("pronouns", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="she/her"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-slate-200">
              Phone
              <input
                value={form.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="(555) 123-4567"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Email
              <input
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="client@email.com"
              />
            </label>
          </div>
          <label className="block text-sm text-slate-200">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              rows={3}
              placeholder="Add any special care notes."
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
              Save client
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
