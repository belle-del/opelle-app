"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToken } from "@/lib/portal/tokenContext";
import { useClientAuth } from "@/lib/portal/authContext";

const STORAGE_KEY = "opelle:client:v1:rebookRequest";
const PENDING_KEY = "opelle:client:v1:pending_token";

type RebookRequest = {
  preferredTimes: string;
  service: string;
  notes: string;
  savedAt?: string;
};

const emptyRequest = (): RebookRequest => ({
  preferredTimes: "",
  service: "",
  notes: "",
});

const safeParse = (value: string | null): RebookRequest | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as RebookRequest;
  } catch {
    return null;
  }
};

export default function ClientRebookPage() {
  const { token } = useToken();
  const { user, loading } = useClientAuth();
  const [form, setForm] = useState<RebookRequest>(emptyRequest());
  const [isSaved, setIsSaved] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    if (stored) {
      setForm(stored);
      setIsSaved(true);
    }
    setPendingToken(window.localStorage.getItem(PENDING_KEY));
  }, []);

  const handleChange = (field: keyof RebookRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.service.trim()) return;
    const payload: RebookRequest = {
      ...form,
      preferredTimes: form.preferredTimes.trim(),
      service: form.service.trim(),
      notes: form.notes.trim(),
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setForm(payload);
    setIsSaved(true);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
        Checking your session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Rebook request</h2>
        <p className="text-slate-300">
          Sign in to request your next appointment.
        </p>
        <Link
          href="/client/login"
          className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Claim your invite</h2>
        <p className="text-slate-300">
          Connect your invite link before requesting a rebook.
        </p>
        {pendingToken ? (
          <Link
            href={`/client/invite/${pendingToken}`}
            className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Continue claim
          </Link>
        ) : (
          <Link
            href="/client/invite/your-invite"
            className="inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Open invite link
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Rebook request</h2>
        <p className="text-slate-300">
          Share preferred times so your stylist can follow up.
        </p>
      </div>

      {isSaved ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          Request sent locally. We&apos;ll follow up with availability soon.
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
      >
        <label className="block text-sm text-slate-200">
          Preferred dates/times
          <textarea
            value={form.preferredTimes}
            onChange={(event) =>
              handleChange("preferredTimes", event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            rows={3}
            placeholder="Example: Weekdays after 4pm, weekends mornings"
          />
        </label>
        <label className="mt-4 block text-sm text-slate-200">
          Service requested
          <input
            value={form.service}
            onChange={(event) => handleChange("service", event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="Color refresh, haircut, etc."
            required
          />
        </label>
        <label className="mt-4 block text-sm text-slate-200">
          Notes
          <textarea
            value={form.notes}
            onChange={(event) => handleChange("notes", event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            rows={3}
            placeholder="Anything else you'd like us to know"
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="submit"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Submit request
          </button>
        </div>
      </form>
    </div>
  );
}
