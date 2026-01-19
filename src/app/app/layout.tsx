import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/app/app/_components/AppNav";
import NewItemMenu from "@/app/app/_components/NewItemMenu";
import DbStatusBanner from "@/app/app/_components/DbStatusBanner";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authDisabled = process.env.OPPELLE_AUTH_DISABLED === "true";

  // Check authentication unless auth is disabled
  if (!authDisabled) {
    const supabase = await createSupabaseAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-[hsl(var(--panelBorder)/0.6)] bg-[hsl(var(--panel)/0.7)] p-6 shadow-[var(--shadow)] backdrop-blur-xl lg:flex">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] op-muted">
              Studio
            </p>
            <div className="text-lg font-semibold tracking-tight op-title">
              Student Console
            </div>
          </div>
          <div className="mt-8 text-[10px] uppercase tracking-[0.3em] op-muted">
            Navigation
          </div>
          <AppNav />
          <Link
            href="/"
            className="mt-auto rounded-lg border border-[hsl(var(--panelBorder)/0.6)] px-3 py-2 text-center text-sm op-muted transition hover:border-[hsl(var(--panelBorder)/0.9)]"
          >
            Back home
          </Link>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <DbStatusBanner />
          <header className="flex items-center justify-between border-b border-[hsl(var(--panelBorder)/0.6)] px-6 py-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] op-muted">
                Opelle
              </p>
              <h1 className="text-xl font-semibold op-title">Student Console</h1>
            </div>
            <div className="flex items-center gap-3">
              <NewItemMenu />
              <ThemeToggle />
              {authDisabled ? (
                <span className="rounded-full border border-amber-300/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700 dark:border-amber-400/50 dark:text-amber-200">
                  Auth Disabled
                </span>
              ) : (
                <Link
                  href="/logout"
                  className="rounded-full border border-[hsl(var(--panelBorder)/0.6)] px-3 py-1 text-xs op-muted transition hover:border-[hsl(var(--panelBorder)/0.9)]"
                >
                  Logout
                </Link>
              )}
            </div>
          </header>

          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
