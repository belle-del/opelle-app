"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Client } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { deleteClient, getClientById, upsertClient } from "@/lib/storage";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    setClient(getClientById(params.id));
  }, [params?.id]);

  if (!client) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Client not found</h2>
        <Link href="/app/clients" className="text-sm text-emerald-200">
          Back to clients
        </Link>
      </div>
    );
  }

  const handleChange = (field: keyof Client, value: string) => {
    setClient((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client.firstName.trim()) return;

    const saved = upsertClient({
      ...client,
      firstName: client.firstName.trim(),
      lastName: client.lastName?.trim() || undefined,
      pronouns: client.pronouns?.trim() || undefined,
      phone: client.phone?.trim() || undefined,
      email: client.email?.trim() || undefined,
      notes: client.notes?.trim() || undefined,
    });
    setClient(saved);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!confirm("Delete this client and related appointments?")) return;
    deleteClient(client.id);
    router.push("/app/clients");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            {getClientDisplayName(client)}
          </h2>
          <p className="text-slate-300">Profile stored locally.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/clients"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Back to clients
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
              First name
              <input
                value={client.firstName}
                onChange={(event) =>
                  handleChange("firstName", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm text-slate-200">
              Last name
              <input
                value={client.lastName ?? ""}
                onChange={(event) =>
                  handleChange("lastName", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Pronouns
              <input
                value={client.pronouns ?? ""}
                onChange={(event) =>
                  handleChange("pronouns", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Phone
              <input
                value={client.phone ?? ""}
                onChange={(event) => handleChange("phone", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Email
              <input
                value={client.email ?? ""}
                onChange={(event) => handleChange("email", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm text-slate-200">
            Notes
            <textarea
              value={client.notes ?? ""}
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
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Contact
              </p>
              <p className="mt-2">{client.phone || "No phone on file"}</p>
              <p>{client.email || "No email on file"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Pronouns
              </p>
              <p className="mt-2">{client.pronouns || "Not specified"}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Notes
            </p>
            <p className="mt-2 text-slate-300">
              {client.notes || "No notes yet."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
