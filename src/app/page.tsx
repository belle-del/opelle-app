import { redirect } from "next/navigation";
import LinkCard from "@/components/LinkCard";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const env = process.env.NEXT_PUBLIC_APP_ENV ?? "unknown";
  const authDisabled = process.env.OPPELLE_AUTH_DISABLED === "true";

  // Redirect based on authentication status (unless auth is disabled)
  if (!authDisabled) {
    const supabase = await createSupabaseAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Authenticated users go straight to the app
      redirect("/app");
    } else {
      // Unauthenticated users go to login
      redirect("/login");
    }
  }

  return (
    <main className="relative min-h-screen px-6 py-16">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="space-y-5">
          <div className="inline-flex items-center gap-3 rounded-full border border-[hsl(var(--panelBorder)/0.6)] bg-[hsl(var(--panel)/0.5)] px-4 py-1 text-[10px] uppercase tracking-[0.3em] op-muted">
            <span className="op-gradient-text font-semibold">Opelle</span>
            <span className="rounded-full bg-[hsl(var(--accent-1)/0.2)] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--accent-1))]">
              Beta
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl op-title">
            Soft-beauty systems for modern studios.
          </h1>
          <p className="max-w-2xl text-base op-muted sm:text-lg">
            Access the Student Console to manage clients, or explore the Client
            Portal experience in a calm, premium workspace.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <LinkCard
            title="Student Console"
            description="Run your day: clients, appointments, formulas, and aftercare in one workspace."
            href="/login?next=/app"
            icon={<span className="text-sm font-semibold">S</span>}
          />
          <LinkCard
            title="Client Portal"
            description="Preview the client-facing portal experience and invite flow."
            href="/client"
            icon={<span className="text-sm font-semibold">C</span>}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs op-muted">
          <span>Environment: {env}</span>
          <span>{commit ? `Commit: ${commit}` : "Commit: unknown"}</span>
          {authDisabled ? (
            <span className="rounded-full border border-amber-300/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700 dark:border-amber-400/50 dark:text-amber-200">
              Auth Disabled (dev)
            </span>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
