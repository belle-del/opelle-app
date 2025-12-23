const modules = [
  {
    title: "Client journey basics",
    description: "Intake, service prep, and aftercare cadence.",
    status: "Draft",
  },
  {
    title: "Signature facial protocol",
    description: "Step-by-step guide for the core Opelle service.",
    status: "In review",
  },
  {
    title: "Retail recommendations",
    description: "Upsell playbook and post-visit product plans.",
    status: "Planned",
  },
];

export default function EducationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Education</h2>
        <p className="text-slate-300">
          Curate studio training modules and client-facing resources.
        </p>
      </div>
      <div className="space-y-3">
        {modules.map((module) => (
          <div
            key={module.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-100">
                  {module.title}
                </p>
                <p className="text-sm text-slate-400">{module.description}</p>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
                {module.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
