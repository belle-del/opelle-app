"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/models";
import { upsertClient } from "@/lib/storage";

const emptyClient: Client = {
  id: "",
  firstName: "",
  lastName: "",
  pronouns: "",
  phone: "",
  email: "",
  notes: "",
  createdAt: "",
  updatedAt: "",
};

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState<Client>(emptyClient);

  const handleChange = (field: keyof Client, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim()) return;

    const saved = upsertClient({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName?.trim() || undefined,
      pronouns: form.pronouns?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    });

    router.push(`/app/clients/${saved.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">New client</h2>
        <p className="text-slate-300">Add a client profile to local storage.</p>
      </div>

      <form
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-200">
            First name
            <input
              value={form.firstName}
              onChange={(event) => handleChange("firstName", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-sm text-slate-200">
            Last name
            <input
              value={form.lastName}
              onChange={(event) => handleChange("lastName", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
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
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/app/clients")}
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
    </div>
  );
}
