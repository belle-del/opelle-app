import EmbeddedAiDemo from "./embedded-ai-demo";
import { flags } from "@/lib/flags";

export default function AppDashboardPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Today
          </p>
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="text-slate-300">
            Your console is live with placeholder dashboards, client flows, and
            local AI stubs.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: "Clients", value: "18 active" },
            { label: "Appointments", value: "6 upcoming" },
            { label: "Formulas", value: "4 in review" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Local AI Sandbox</h3>
          <p className="text-slate-300">
            Run deterministic embedded AI tasks to verify client-side
            integrations before wiring external providers.
          </p>
        </div>
        <div className="mt-6">
          <EmbeddedAiDemo enabled={flags.EMBEDDED_AI_ENABLED} />
        </div>
      </section>
    </div>
  );
}
