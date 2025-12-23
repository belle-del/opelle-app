"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ClientInput } from "@/lib/models";
import { deleteClient, getClientById, saveClient } from "@/lib/storage";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<ClientInput | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const client = getClientById(params.id);
    if (!client) {
      setForm(null);
      return;
    }
    setForm({
      id: client.id,
      name: client.name,
      pronouns: client.pronouns ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      notes: client.notes ?? "",
    });
  }, [params?.id]);

  if (!form) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Client not found</h2>
        <Link href="/app/clients" className="text-sm text-emerald-200">
          Back to clients
        </Link>
      </div>
    );
  }

  const handleChange = (
    field: keyof ClientInput,
    value: string | undefined
  ) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
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
  };

  const handleDelete = () => {
    if (!confirm("Delete this client and related appointments?")) return;
    deleteClient(form.id ?? "");
    router.push("/app/clients");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{form.name}</h2>
          <p className="text-slate-300">Edit details stored locally.</p>
        </div>
        <Link
          href="/app/clients"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
        >
          Back to clients
        </Link>
      </div>

      <form
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-200">
            Name
            <input
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-sm text-slate-200">
            Pronouns
            <input
              value={form.pronouns}
              onChange={(event) => handleChange("pronouns", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Phone
            <input
              value={form.phone}
              onChange={(event) => handleChange("phone", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Email
            <input
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
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
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full border border-rose-500/60 px-4 py-2 text-sm text-rose-200"
          >
            Delete client
          </button>
          <button
            type="submit"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
