import LinkCard from "@/components/LinkCard";

export default function HomePage() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const env = process.env.NEXT_PUBLIC_APP_ENV ?? "unknown";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            Opelle
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Your workspace, organized.
          </h1>
          <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
            Jump into the Student Console to manage clients or open the Client
            Portal to preview the experience.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <LinkCard
            title="Student"
            description="Manage clients, appointments, and formulas in the console."
            href="/app"
            icon={<span className="text-sm font-semibold">S</span>}
          />
          <LinkCard
            title="Client"
            description="Preview the client-facing portal experience."
            href="/client"
            icon={<span className="text-sm font-semibold">C</span>}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>Environment: {env}</span>
          <span>
            {commit ? `Commit: ${commit}` : "Commit: unknown"}
          </span>
        </footer>
      </div>
    </main>
  );
}
