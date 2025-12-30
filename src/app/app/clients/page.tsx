"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Client } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import { getClients } from "@/lib/storage";
import { formatDbError, isDbConfigured } from "@/lib/db/health";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState("");
  const [dbError, setDbError] = useState<string | null>(null);
  const dbConfigured = isDbConfigured();
  const canWrite = dbConfigured && !dbError;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!dbConfigured) {
        setClients(getClients());
        return;
      }
      try {
        const res = await fetch("/api/db/clients");
        const json = (await res.json()) as { ok: boolean; data?: Client[]; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "DB fetch failed");
        }
        if (active) {
          setClients(json.data ?? []);
        }
      } catch (error) {
        const message = formatDbError(error);
        setDbError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("opelle:db-error", { detail: message })
          );
        }
        setClients(getClients());
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [dbConfigured]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrigin(window.location.origin);
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
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!origin || !canWrite) return;
                    fetch(`/api/db/clients/${client.id}/invite`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "ensure" }),
                    })
                      .then(async (res) => {
                        const json = (await res.json()) as {
                          ok: boolean;
                          data?: { token: string };
                          error?: string;
                        };
                        if (!res.ok || !json.ok || !json.data?.token) {
                          throw new Error(json.error || "Invite failed");
                        }
                        const link = `${origin}/client/invite/${json.data.token}`;
                        await navigator.clipboard.writeText(link);
                        setCopyStatus((prev) => ({
                          ...prev,
                          [client.id]: "Copied!",
                        }));
                        setTimeout(() => {
                          setCopyStatus((prev) => {
                            const next = { ...prev };
                            delete next[client.id];
                            return next;
                          });
                        }, 2000);
                      })
                      .catch(() => {
                        setCopyStatus((prev) => ({
                          ...prev,
                          [client.id]: "Copy failed",
                        }));
                      });
                  }}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                  disabled={!canWrite}
                  title={
                    canWrite ? "Copy invite link" : "Connect DB to enable saves"
                  }
                >
                  Invite
                </button>
                {copyStatus[client.id] ? (
                  <span className="text-emerald-200">
                    {copyStatus[client.id]}
                  </span>
                ) : null}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
