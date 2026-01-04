"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/models";
import { formatDbError } from "@/lib/db/health";
import { useRepo } from "@/lib/repo";

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
  const repo = useRepo();
  const [form, setForm] = useState<Client>(emptyClient);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof Client, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim()) return;

    try {
      const saved = await repo.upsertClient(form);
      router.push(`/app/clients/${saved.id}`);
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
        <h2 className="text-2xl font-semibold">New client</h2>
        <p className="text-muted-foreground">Add a client profile to local storage.</p>
      </div>

      <form
        className="rounded-2xl border border-border bg-card/70 p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-foreground">
            First name
            <input
              value={form.firstName}
              onChange={(event) => handleChange("firstName", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-sm text-foreground">
            Last name
            <input
              value={form.lastName}
              onChange={(event) => handleChange("lastName", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-foreground">
            Pronouns
            <input
              value={form.pronouns}
              onChange={(event) => handleChange("pronouns", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-foreground">
            Phone
            <input
              value={form.phone}
              onChange={(event) => handleChange("phone", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-foreground">
            Email
            <input
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
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
            onClick={() => router.push("/app/clients")}
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold op-on-accent"
            title="Save client"
          >
            Save client
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
