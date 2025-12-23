import { flags } from "@/lib/flags";

export default function SettingsPage() {
  const supabaseUrlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKeySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-slate-300">
          Feature flags and environment status for this local shell.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold">Feature flags</h3>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <dt className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Embedded AI
            </dt>
            <dd className="mt-2 text-sm text-slate-100">
              {flags.EMBEDDED_AI_ENABLED ? "Enabled" : "Disabled"}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <dt className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Metis Assist
            </dt>
            <dd className="mt-2 text-sm text-slate-100">
              {flags.METIS_ASSIST_ENABLED ? "Enabled" : "Disabled"}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <dt className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Client Portal
            </dt>
            <dd className="mt-2 text-sm text-slate-100">
              {flags.CLIENT_PORTAL_ENABLED ? "Enabled" : "Disabled"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold">Environment status</h3>
        <div className="mt-4 space-y-2 text-sm text-slate-200">
          <p>
            NEXT_PUBLIC_SUPABASE_URL: {supabaseUrlSet ? "set" : "missing"}
          </p>
          <p>
            NEXT_PUBLIC_SUPABASE_ANON_KEY: {supabaseKeySet ? "set" : "missing"}
          </p>
        </div>
      </section>
    </div>
  );
}
