"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClientPacket } from "@/lib/portal/useClientPacket";
import { useToken } from "@/lib/portal/tokenContext";

const INTAKE_KEY = "opelle:client:v1:intake";
const REBOOK_KEY = "opelle:client:v1:rebookRequest";

type IntakeForm = {
  name: string;
  pronouns: string;
  phone: string;
  email: string;
  allergies: string;
  goals: string;
  savedAt?: string;
};

const safeParse = (value: string | null): IntakeForm | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as IntakeForm;
  } catch {
    return null;
  }
};

export default function ClientProfilePage() {
  const { token, setToken } = useToken();
  const { packet } = useClientPacket(token);
  const [intake, setIntake] = useState<IntakeForm | null>(null);
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIntake(safeParse(window.localStorage.getItem(INTAKE_KEY)));
  }, []);

  const handleClear = () => {
    if (confirm !== "CLEAR") return;
    window.localStorage.removeItem(INTAKE_KEY);
    window.localStorage.removeItem(REBOOK_KEY);
    setIntake(null);
    setConfirm("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Profile</h2>
        <p className="text-slate-300">
          Review the information saved on this device.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <h3 className="text-lg font-semibold">Portal connection</h3>
        {packet ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-slate-300">
              Stylist: {packet.stylist.displayName}
              {packet.stylist.salonName
                ? ` · ${packet.stylist.salonName}`
                : ""}
            </p>
            <p className="text-sm text-slate-300">
              Client: {packet.client.firstName}{" "}
              {packet.client.lastName ?? ""}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            No invite token connected yet.
          </p>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setToken(null)}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200"
          >
            Disconnect
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <h3 className="text-lg font-semibold">Intake details</h3>
        {intake ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Name</p>
              <p>{intake.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Pronouns</p>
              <p>{intake.pronouns || "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Phone</p>
              <p>{intake.phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p>{intake.email || "Not provided"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-400">Allergies</p>
              <p>{intake.allergies || "None listed"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-400">Goals</p>
              <p>{intake.goals || "No goals added"}</p>
            </div>
            {intake.savedAt ? (
              <p className="md:col-span-2 text-xs text-slate-500">
                Saved {new Date(intake.savedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            No intake info saved yet. Fill out the intake form to get started.
          </div>
        )}

        <div className="mt-4">
          <Link
            href="/client/intake"
            className="text-sm text-emerald-200"
          >
            {intake ? "Update intake form" : "Go to intake form"}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
        <h3 className="text-lg font-semibold">Clear local data</h3>
        <p className="mt-2 text-xs text-rose-100">
          This removes saved intake and rebook requests from this device only.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Type CLEAR to confirm"
            className="rounded-lg border border-rose-300/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-100"
          />
          <button
            type="button"
            onClick={handleClear}
            disabled={confirm !== "CLEAR"}
            className="rounded-full border border-rose-200/70 px-4 py-2 text-xs text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear local data
          </button>
        </div>
      </section>
    </div>
  );
}
