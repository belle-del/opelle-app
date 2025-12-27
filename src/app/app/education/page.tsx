const modules = [
  {
    title: "Consultation foundations",
    description: "Greeting, intake flow, and building trust in 10 minutes.",
    status: "Draft",
  },
  {
    title: "Signature color correction",
    description: "Checklist for evaluating undertones and formula planning.",
    status: "In review",
  },
  {
    title: "Retail recommendation playbook",
    description: "Product pairing tips for aftercare success.",
    status: "Planned",
  },
  {
    title: "Texture services overview",
    description: "Safety notes, timing guidelines, and pre-checks.",
    status: "Draft",
  },
  {
    title: "Client retention rituals",
    description: "Follow-ups, rebooking scripts, and referral notes.",
    status: "Planned",
  },
  {
    title: "Seasonal trend lab",
    description: "Trend notes, swatches, and formula experiments.",
    status: "In review",
  },
];

const notes = [
  "Update the spring trend deck before the next staff meeting.",
  "Add a gloss troubleshooting checklist to the protocols.",
  "Capture before/after images for the education hub demo.",
];

const links = [
  "Client intake checklist",
  "Product pairing guide",
  "Aftercare email templates",
];

export default function EducationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Education Hub</h2>
        <p className="text-slate-300">
          Organize training modules, resources, and learning notes.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold">Modules</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {modules.map((module) => (
            <div
              key={module.title}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-100">
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold">Saved notes</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {notes.map((note) => (
              <div
                key={note}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              >
                {note}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold">Quick links</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {links.map((link) => (
              <div
                key={link}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              >
                {link}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
