"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Client } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { getClients } from "@/lib/storage";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setClients(getClients());
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      const haystack = [
        client.firstName,
        client.lastName ?? "",
        client.phone ?? "",
        client.email ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Clients</h2>
          <p className="text-slate-300">
            Manage client profiles stored locally in this browser.
          </p>
        </div>
        <Link
          href="/app/clients/new"
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Add Client
        </Link>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200"
        placeholder="Search by name, phone, or email"
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            No clients yet. Add your first client to get started.
          </div>
        ) : (
          filtered.map((client) => (
            <Link
              key={client.id}
              href={`/app/clients/${client.id}`}
              className="block rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-emerald-500/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-100">
                    {getClientDisplayName(client)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Updated {new Date(client.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-sm text-slate-300">
                  {client.phone ? <p>{client.phone}</p> : null}
                  {client.email ? <p>{client.email}</p> : null}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
