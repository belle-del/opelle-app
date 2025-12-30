"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useClientPacket } from "@/lib/portal/useClientPacket";
import { useToken } from "@/lib/portal/tokenContext";
import { useClientAuth } from "@/lib/portal/authContext";

const PENDING_KEY = "opelle:client:v1:pending_token";

export default function ClientHomePage() {
  const { token } = useToken();
  const { user, loading } = useClientAuth();
  const { packet } = useClientPacket(token ?? null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PENDING_KEY);
    setPendingToken(stored);
  }, []);

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
        <h2 className="text-2xl font-semibold">Client portal</h2>
        <p className="text-slate-300">
          Sign in to view your aftercare and appointment details.
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
          Use the invite link from your stylist to connect your portal.
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

  const nextAppointment = packet?.nextAppointment;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Your client portal</h2>
        <p className="text-slate-300">
          Quick access to aftercare, intake, and future bookings.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Upcoming appointment
          </p>
          {nextAppointment ? (
            <div className="mt-2 text-sm text-slate-200">
              <p className="font-semibold">{nextAppointment.serviceName}</p>
              <p>{new Date(nextAppointment.startAt).toLocaleString()}</p>
              <p>{nextAppointment.durationMin} min</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-200">
              No appointment scheduled yet. Your stylist will update this after
              confirmation.
            </p>
          )}
        </div>

        <Link
          href="/client/aftercare"
          className="block rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-600"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Aftercare
          </p>
          <p className="mt-2 text-sm text-slate-200">
            {packet?.aftercare.summary ??
              "Review your personalized care plan and product tips."}
          </p>
        </Link>

        <Link
          href="/client/intake"
          className="block rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-600"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Intake form
          </p>
          <p className="mt-2 text-sm text-slate-200">
            Share sensitivities, goals, and contact details.
          </p>
        </Link>

        <Link
          href="/client/rebook"
          className="block rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-600"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Rebook
          </p>
          <p className="mt-2 text-sm text-slate-200">
            Request your next appointment window.
          </p>
        </Link>
      </div>
    </div>
  );
}
