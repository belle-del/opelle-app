"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Appointment, Client, Formula } from "@/lib/models";
import { getClientDisplayName } from "@/lib/models";
import type { AftercareDraftResult } from "@/lib/ai/types";
import { generateAftercareDraft } from "@/lib/ai/embedded";
import {
  deleteClient,
  ensureClientInviteToken,
  getAppointments,
  getClientById,
  getFormulas,
  regenerateClientInviteToken,
  upsertClient,
} from "@/lib/storage";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteUpdatedAt, setInviteUpdatedAt] = useState<string | null>(null);
  const [inviteOrigin, setInviteOrigin] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [aftercareService, setAftercareService] = useState("");
  const [aftercareNotes, setAftercareNotes] = useState("");
  const [aftercareDraft, setAftercareDraft] =
    useState<AftercareDraftResult | null>(null);
  const [aftercareStatus, setAftercareStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    setClient(getClientById(params.id));
    setFormulas(getFormulas());
    setAppointments(getAppointments());
  }, [params?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInviteOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!client?.id || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(
      `opelle:v1:aftercareDraft:${client.id}`
    );
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        draft?: AftercareDraftResult;
        serviceName?: string;
        notes?: string;
      };
      if (parsed.draft) {
        setAftercareDraft(parsed.draft);
        setAftercareService(parsed.serviceName ?? "");
        setAftercareNotes(parsed.notes ?? "");
      }
    } catch {
      // ignore invalid stored drafts
    }
  }, [client?.id]);

  const upcomingAppointments = useMemo(() => {
    if (!client) return [];
    const now = new Date().toISOString();
    return appointments
      .filter(
        (appointment) =>
          appointment.clientId === client.id &&
          appointment.startAt >= now &&
          appointment.status !== "cancelled"
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, 3);
  }, [appointments, client]);

  const recentFormulas = useMemo(() => {
    if (!client) return [];
    return formulas
      .filter((formula) => formula.clientId === client.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3);
  }, [client, formulas]);

  const latestAppointment = useMemo(() => {
    if (!client) return null;
    return appointments
      .filter((appointment) => appointment.clientId === client.id)
      .sort((a, b) => b.startAt.localeCompare(a.startAt))[0] ?? null;
  }, [appointments, client]);

  useEffect(() => {
    if (aftercareService.trim()) return;
    if (latestAppointment?.serviceName) {
      setAftercareService(latestAppointment.serviceName);
    }
  }, [aftercareService, latestAppointment?.serviceName]);

  const activity = useMemo(() => {
    if (!client) return [];
    const appointmentItems = appointments
      .filter((appt) => appt.clientId === client.id)
      .map((appt) => ({
        id: appt.id,
        label: `Appointment • ${appt.serviceName}`,
        date: appt.updatedAt,
        href: `/app/appointments/${appt.id}`,
      }));
    const formulaItems = formulas
      .filter((formula) => formula.clientId === client.id)
      .map((formula) => ({
        id: formula.id,
        label: `Formula • ${formula.title}`,
        date: formula.updatedAt,
        href: `/app/formulas/${formula.id}`,
      }));

    return [...appointmentItems, ...formulaItems]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [appointments, client, formulas]);

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

  const handleEnsureInvite = () => {
    if (!client) return;
    const { token, updatedAt } = ensureClientInviteToken(client.id);
    setInviteToken(token);
    setInviteUpdatedAt(updatedAt);
  };

  const handleCopyInvite = async () => {
    if (!client || !inviteOrigin) return;
    const token =
      inviteToken ?? ensureClientInviteToken(client.id).token;
    setInviteToken(token);
    const url = `${inviteOrigin}/client/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteStatus("Copied!");
    } catch {
      setInviteStatus("Copy failed.");
    }
  };

  const handleOpenInvite = () => {
    if (!client || !inviteOrigin) return;
    const token =
      inviteToken ?? ensureClientInviteToken(client.id).token;
    setInviteToken(token);
    const url = `${inviteOrigin}/client/invite/${token}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRegenerateInvite = () => {
    if (!client) return;
    if (!confirm("Regenerate invite link? The previous link will stop working.")) {
      return;
    }
    const { token, updatedAt } = regenerateClientInviteToken(client.id);
    setInviteToken(token);
    setInviteUpdatedAt(updatedAt);
    setInviteStatus("Regenerated.");
  };

  const handleGenerateAftercare = () => {
    if (!client) return;
    const draft = generateAftercareDraft({
      clientName: getClientDisplayName(client),
      serviceName: aftercareService || "Signature Service",
      notes: aftercareNotes || undefined,
    });
    setAftercareDraft(draft);
    setAftercareStatus("Draft generated.");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `opelle:v1:aftercareDraft:${client.id}`,
        JSON.stringify({
          draft,
          serviceName: aftercareService,
          notes: aftercareNotes,
        })
      );
    }
  };

  const handleCopyAftercare = async () => {
    if (!aftercareDraft) return;
    const copyText = [
      aftercareDraft.title,
      "",
      aftercareDraft.summary,
      "",
      "Do:",
      ...aftercareDraft.do.map((item) => `- ${item}`),
      "",
      "Don't:",
      ...aftercareDraft.dont.map((item) => `- ${item}`),
      "",
      `Rebook: ${aftercareDraft.rebookRecommendation}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(copyText);
      setAftercareStatus("Copied to clipboard.");
    } catch {
      setAftercareStatus("Copy failed.");
    }
  };

  const handleClearAftercare = () => {
    if (!client) return;
    setAftercareDraft(null);
    setAftercareStatus(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`opelle:v1:aftercareDraft:${client.id}`);
    }
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
        <div className="space-y-6">
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Invite link</h3>
                <p className="text-slate-400">
                  Share this link with your client to access the portal.
                </p>
              </div>
              <button
                type="button"
                onClick={handleEnsureInvite}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
              >
                {inviteToken ? "Refresh" : "Generate"}
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <input
                readOnly
                value={
                  inviteOrigin && inviteToken
                    ? `${inviteOrigin}/client/invite/${inviteToken}`
                    : "Generate a link to share"
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={handleOpenInvite}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                >
                  Open link
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateInvite}
                  className="rounded-full border border-rose-500/60 px-3 py-1 text-xs text-rose-200"
                >
                  Regenerate
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {inviteUpdatedAt
                  ? `Last generated ${new Date(inviteUpdatedAt).toLocaleString()}`
                  : "Not generated yet"}
              </p>
              {inviteStatus ? (
                <p className="text-xs text-emerald-200">{inviteStatus}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Aftercare Draft</h3>
                <p className="text-slate-400">
                  Generate a local aftercare plan for this client.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-200">
                Service name
                <input
                  value={aftercareService}
                  onChange={(event) => setAftercareService(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="Service name"
                />
              </label>
              <label className="block text-sm text-slate-200 md:col-span-2">
                Notes (optional)
                <textarea
                  value={aftercareNotes}
                  onChange={(event) => setAftercareNotes(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Sensitive areas, product preferences, follow-up tips"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateAftercare}
                className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950"
              >
                Generate Aftercare (Local)
              </button>
              <button
                type="button"
                onClick={handleCopyAftercare}
                className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200"
                disabled={!aftercareDraft}
              >
                Copy to clipboard
              </button>
              <button
                type="button"
                onClick={handleClearAftercare}
                className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200"
              >
                Clear draft
              </button>
            </div>
            {aftercareStatus ? (
              <p className="mt-2 text-xs text-emerald-200">
                {aftercareStatus}
              </p>
            ) : null}

            {aftercareDraft ? (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
                <h4 className="text-lg font-semibold">
                  {aftercareDraft.title}
                </h4>
                <p className="mt-2 text-slate-300">
                  {aftercareDraft.summary}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Do
                    </p>
                    <ul className="mt-2 space-y-1 text-slate-300">
                      {aftercareDraft.do.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Don&apos;t
                    </p>
                    <ul className="mt-2 space-y-1 text-slate-300">
                      {aftercareDraft.dont.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-300">
                  {aftercareDraft.rebookRecommendation}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-400">
                No draft yet. Generate a local aftercare plan to preview it.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Upcoming appointments</h3>
                <p className="text-slate-400">
                  Next sessions for {getClientDisplayName(client)}.
                </p>
              </div>
              <Link
                href={`/app/appointments/new?clientId=${client.id}`}
                className="rounded-full border border-emerald-500/60 px-3 py-1 text-xs text-emerald-200"
              >
                New appointment
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-slate-400">No upcoming appointments.</p>
              ) : (
                upcomingAppointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/app/appointments/${appointment.id}`}
                    className="block rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <p className="font-semibold">{appointment.serviceName}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(appointment.startAt).toLocaleString()}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Formulas</h3>
                <p className="text-slate-400">
                  Recent formulas for {getClientDisplayName(client)}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/app/formulas?clientId=${client.id}`}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                >
                  View all
                </Link>
                <Link
                  href={`/app/formulas/new?clientId=${client.id}`}
                  className="rounded-full border border-emerald-500/60 px-3 py-1 text-xs text-emerald-200"
                >
                  New formula
                </Link>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {recentFormulas.length === 0 ? (
                <p className="text-sm text-slate-400">No formulas yet.</p>
              ) : (
                recentFormulas.map((formula) => (
                  <Link
                    key={formula.id}
                    href={`/app/formulas/${formula.id}`}
                    className="block rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <p className="font-semibold">{formula.title}</p>
                    <p className="text-xs text-slate-400">
                      {formula.colorLine || "No color line"} •{" "}
                      {new Date(formula.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          {activity.length > 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
              <h3 className="text-lg font-semibold">Activity</h3>
              <div className="mt-4 space-y-2">
                {activity.map((item) => (
                  <Link
                    key={`${item.label}-${item.id}`}
                    href={item.href}
                    className="block rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
