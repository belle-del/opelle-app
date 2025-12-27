"use client";

import Link from "next/link";
import { useClientPacket } from "@/lib/portal/useClientPacket";
import { useToken } from "@/lib/portal/tokenContext";

export default function ClientHomePage() {
  const { token } = useToken();
  const { packet } = useClientPacket(token);

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
              <p className="font-semibold">
                {nextAppointment.serviceName}
              </p>
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
