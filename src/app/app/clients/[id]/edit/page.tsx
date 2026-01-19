"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Client } from "@/lib/models";
import { formatDbError } from "@/lib/db/health";
import { useRepo } from "@/lib/repo";

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const repo = useRepo();
  const [form, setForm] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    let active = true;

    const load = async () => {
      try {
        const clientData = await repo.getClientById(params.id);
        if (active) {
          setForm(clientData);
          setLoading(false);
        }
      } catch (err) {
        const message = formatDbError(err);
        setError(message);
        setLoading(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [params?.id, repo]);

  const handleChange = (field: keyof Client, value: string) => {
    if (!form) return;
    setForm((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !form.firstName.trim()) return;

    try {
      await repo.upsertClient(form);
      router.push(`/app/clients/${form.id}`);
    } catch (err) {
      const message = formatDbError(err);
      setError(message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
      }
    }
  };

  const handleDelete = async () => {
    if (!form) return;
    if (!confirm(`Delete ${form.firstName} ${form.lastName || ""}?`)) return;

    try {
      await repo.deleteClient(form.id);
      router.push("/app/clients");
    } catch (err) {
      const message = formatDbError(err);
      setError(message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("opelle:db-error", { detail: message }));
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Client not found</h2>
          <p className="text-muted-foreground">Unable to load client for editing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Edit client</h2>
        <p className="text-muted-foreground">Update client information.</p>
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
              value={form.lastName || ""}
              onChange={(event) => handleChange("lastName", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-foreground">
            Pronouns
            <input
              value={form.pronouns || ""}
              onChange={(event) => handleChange("pronouns", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-foreground">
            Phone
            <input
              value={form.phone || ""}
              onChange={(event) => handleChange("phone", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-foreground">
            Email
            <input
              value={form.email || ""}
              onChange={(event) => handleChange("email", event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm text-foreground">
          Notes
          <textarea
            value={form.notes || ""}
            onChange={(event) => handleChange("notes", event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={4}
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full border border-rose-500/60 px-4 py-2 text-sm text-rose-600 dark:text-rose-300"
          >
            Delete client
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push(`/app/clients/${form.id}`)}
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold op-on-accent"
              title="Save changes"
            >
              Save changes
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
