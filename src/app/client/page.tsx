import Link from "next/link";

export default function ClientHomePage() {
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
          <p className="mt-2 text-sm text-slate-200">
            No appointment scheduled yet. Your stylist will update this after
            confirmation.
          </p>
        </div>

        <Link
          href="/client/aftercare"
          className="block rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-600"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Aftercare
          </p>
          <p className="mt-2 text-sm text-slate-200">
            Review your personalized care plan and product tips.
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
