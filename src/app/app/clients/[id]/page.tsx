"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Appointment, Client, Formula } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import type { AftercareDraftResult } from "@/lib/ai/types";
import { generateAftercareDraft } from "@/lib/ai/embedded";
import { formatDbError } from "@/lib/db/health";
import { useRepo } from "@/lib/repo";

const tabs = ["overview", "appointments", "formulas", "aftercare", "invite"] as const;

type Tab = (typeof tabs)[number];

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const repo = useRepo();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [dbError, setDbError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteUpdatedAt, setInviteUpdatedAt] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [aftercareService, setAftercareService] = useState("");
  const [aftercareNotes, setAftercareNotes] = useState("");
  const [aftercareDraft, setAftercareDraft] =
    useState<AftercareDraftResult | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    const load = async () => {
      try {
        if (active) {
          const [clientData, apptData, formulaData] = await Promise.all([
            repo.getClientById(params.id),
            repo.getAppointments(),
            repo.getFormulas(),
          ]);
          setClient(clientData);
          setAppointments(apptData);
          setFormulas(formulaData);
        }
      } catch (error) {
        const message = formatDbError(error);
        setDbError(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("opelle:db-error", { detail: message })
          );
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [params?.id, repo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!client?.id || tab !== "invite") return;
    let active = true;
    const loadInvite = async () => {
      try {
        const invite = await repo.ensureClientInviteToken(client.id);
        if (!active) return;
        setInviteToken(invite.token);
        setInviteUpdatedAt(invite.updatedAt);
        setInviteStatus(null);
      } catch (error) {
        const message = formatDbError(error);
        setInviteStatus(message);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("opelle:db-error", { detail: message })
          );
        }
      }
    };
    loadInvite();
    return () => {
      active = false;
    };
  }, [client?.id, repo, tab]);

  const clientAppointments = useMemo(() => {
    if (!client) return [];
    return appointments
      .filter((appointment) => appointment.clientId === client.id)
      .sort((a, b) => b.startAt.localeCompare(a.startAt));
  }, [appointments, client]);

  const clientFormulas = useMemo(() => {
    if (!client) return [];
    return formulas
      .filter((formula) => formula.clientId === client.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [formulas, client]);

  const nextAppointment = useMemo(() => {
    const now = new Date().toISOString();
    return clientAppointments
      .filter((appointment) => appointment.startAt >= now)
      .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  }, [clientAppointments]);

  const lastFormula = useMemo(() => clientFormulas[0], [clientFormulas]);

  const handleCopyInvite = async () => {
    if (!client?.id || !origin) return;
    try {
      const invite = await repo.ensureClientInviteToken(client.id);
      setInviteToken(invite.token);
      setInviteUpdatedAt(invite.updatedAt);
      const link = `${origin}/client/invite/${invite.token}`;
      await navigator.clipboard.writeText(link);
      setInviteStatus("Copied to clipboard.");
      setTimeout(() => setInviteStatus(null), 2000);
    } catch (error) {
      const message = formatDbError(error);
      setInviteStatus(message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("opelle:db-error", { detail: message })
        );
      }
    }
  };

  const handleRegenerateInvite = async () => {
    if (!client?.id || !origin) return;
    if (!confirm("Regenerate this invite link?")) return;
    try {
      const invite = await repo.regenerateClientInviteToken(client.id);
      setInviteToken(invite.token);
      setInviteUpdatedAt(invite.updatedAt);
      setInviteStatus("Invite link regenerated.");
    } catch (error) {
      const message = formatDbError(error);
      setInviteStatus(message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("opelle:db-error", { detail: message })
        );
      }
    }
  };

  const handleGenerateAftercare = () => {
    if (!client) return;
    const name = getClientDisplayName(client);
    const draft = generateAftercareDraft({
      clientName: name,
      serviceName: aftercareService.trim() || "Service",
      notes: aftercareNotes.trim() || undefined,
    });
    setAftercareDraft(draft);
  };

  if (!client) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Client not found</h2>
        <Link href="/app/clients" className="text-sm text-emerald-600 dark:text-emerald-200">
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Client Hub
          </p>
          <h2 className="text-3xl font-semibold">
            {getClientDisplayName(client)}
          </h2>
          <div className="mt-2 text-sm text-muted-foreground">
            {client.email ? <p>{client.email}</p> : null}
            {client.phone ? <p>{client.phone}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/clients"
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
          >
            Back to clients
          </Link>
          <button
            type="button"
            onClick={() => router.push(`/app/appointments/new?clientId=${client.id}`)}
            className="rounded-full border border-emerald-500/60 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-200"
          >
            Book appointment
          </button>
          <button
            type="button"
            onClick={() => router.push(`/app/formulas/new?clientId=${client.id}`)}
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
          >
            Add formula
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === item
                ? "bg-muted text-foreground"
                : "border border-border text-foreground"
            }`}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h3 className="text-lg font-semibold">Next appointment</h3>
            {nextAppointment ? (
              <div className="mt-3 text-sm text-muted-foreground">
                <p className="text-foreground">{nextAppointment.serviceName}</p>
                <p>{new Date(nextAppointment.startAt).toLocaleString()}</p>
                <Link
                  href={`/app/appointments/${nextAppointment.id}`}
                  className="mt-3 inline-flex text-xs text-emerald-600 dark:text-emerald-200"
                >
                  View appointment
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No upcoming appointments yet.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h3 className="text-lg font-semibold">Last formula</h3>
            {lastFormula ? (
              <div className="mt-3 text-sm text-muted-foreground">
                <p className="text-foreground">{lastFormula.title}</p>
                <p>
                  Updated {new Date(lastFormula.updatedAt).toLocaleDateString()}
                </p>
                <Link
                  href={`/app/formulas/${lastFormula.id}`}
                  className="mt-3 inline-flex text-xs text-emerald-600 dark:text-emerald-200"
                >
                  View formula
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No formulas saved yet.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h3 className="text-lg font-semibold">Quick actions</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <button
                type="button"
                onClick={() => router.push(`/app/appointments/new?clientId=${client.id}`)}
                className="rounded-full border border-border px-4 py-2 text-foreground"
              >
                Book appointment
              </button>
              <button
                type="button"
                onClick={() => router.push(`/app/formulas/new?clientId=${client.id}`)}
                className="rounded-full border border-border px-4 py-2 text-foreground"
              >
                Add formula
              </button>
              <button
                type="button"
                onClick={() => setTab("aftercare")}
                className="rounded-full border border-border px-4 py-2 text-foreground"
              >
                Generate aftercare
              </button>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="rounded-full border border-emerald-500/60 px-4 py-2 text-emerald-600 dark:text-emerald-200"
              >
                Copy invite link
              </button>
            </div>
            {inviteStatus ? (
              <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-200">{inviteStatus}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "appointments" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Appointments</h3>
            <Link
              href={`/app/appointments/new?clientId=${client.id}`}
              className="rounded-full border border-emerald-500/60 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-200"
            >
              Add appointment
            </Link>
          </div>
          {clientAppointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted-foreground">
              No appointments yet. Book the first session for this client.
            </div>
          ) : (
            <div className="space-y-3">
              {clientAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/app/appointments/${appointment.id}`}
                  className="block rounded-2xl border border-border bg-card/70 p-5 transition hover:border-emerald-500/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {appointment.serviceName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(appointment.startAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{appointment.durationMin} min</p>
                      <p className="capitalize">{appointment.status}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "formulas" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Formulas</h3>
            <Link
              href={`/app/formulas/new?clientId=${client.id}`}
              className="rounded-full border border-emerald-500/60 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-200"
            >
              Add formula
            </Link>
          </div>
          {clientFormulas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-sm text-muted-foreground">
              No formulas yet. Save your first recipe for this client.
            </div>
          ) : (
            <div className="space-y-3">
              {clientFormulas.map((formula) => (
                <Link
                  key={formula.id}
                  href={`/app/formulas/${formula.id}`}
                  className="block rounded-2xl border border-border bg-card/70 p-5 transition hover:border-emerald-500/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {formula.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Updated {new Date(formula.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {formula.serviceType}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "aftercare" ? (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Aftercare draft</h3>
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-foreground">
                Service name
                <input
                  value={aftercareService}
                  onChange={(event) => setAftercareService(event.target.value)}
                  placeholder={nextAppointment?.serviceName ?? "Signature service"}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-foreground md:col-span-2">
                Notes
                <textarea
                  value={aftercareNotes}
                  onChange={(event) => setAftercareNotes(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  rows={4}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateAftercare}
                className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold op-on-accent"
              >
                Generate aftercare
              </button>
              <button
                type="button"
                onClick={() => {
                  setAftercareDraft(null);
                  setAftercareNotes("");
                  setAftercareService("");
                }}
                className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
              >
                Clear
              </button>
            </div>
          </div>
          {aftercareDraft ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
              <h4 className="text-base font-semibold">{aftercareDraft.title}</h4>
              <p className="mt-2 text-emerald-50">{aftercareDraft.summary}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-200">
                    Do
                  </p>
                  <ul className="mt-2 space-y-1">
                    {aftercareDraft.do.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-200">
                    Don’t
                  </p>
                  <ul className="mt-2 space-y-1">
                    {aftercareDraft.dont.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-4 text-xs text-emerald-600 dark:text-emerald-200">
                {aftercareDraft.rebookRecommendation}
              </p>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${aftercareDraft.title}\n\n${aftercareDraft.summary}`
                  )
                }
                className="mt-4 rounded-full border border-emerald-300/50 px-4 py-2 text-xs text-emerald-100"
              >
                Copy summary
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "invite" ? (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Invite link</h3>
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            <label className="block text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Invite URL
            </label>
            <input
              readOnly
              value={
                inviteToken && origin
                  ? `${origin}/client/invite/${inviteToken}`
                  : "Generating invite link..."
              }
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyInvite}
                className="rounded-full border border-emerald-500/60 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-200"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={handleRegenerateInvite}
                className="rounded-full border border-rose-500/60 px-4 py-2 text-sm text-rose-600 dark:text-rose-300"
              >
                Regenerate token
              </button>
            </div>
            {inviteUpdatedAt ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Last generated {new Date(inviteUpdatedAt).toLocaleString()}
              </p>
            ) : null}
            {inviteStatus ? (
              <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-200">{inviteStatus}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {dbError ? (
        <p className="text-sm text-rose-600 dark:text-rose-300">DB error: {dbError}</p>
      ) : null}
    </div>
  );
}
