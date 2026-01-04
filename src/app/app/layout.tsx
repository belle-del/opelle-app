import Link from "next/link";
import AppNav from "@/app/app/_components/AppNav";
import NewItemMenu from "@/app/app/_components/NewItemMenu";
import DbStatusBanner from "@/app/app/_components/DbStatusBanner";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authDisabled = process.env.OPPELLE_AUTH_DISABLED === "true";

  return (
    <div className="min-h-screen op-bg">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r op-border bg-[hsl(var(--panel)/0.55)] p-6 lg:flex">
          <div className="text-lg font-semibold tracking-tight op-title">
            Student Console
          </div>
          <AppNav />
          <Link
            href="/"
            className="mt-auto rounded-lg border op-border px-3 py-2 text-center text-sm op-muted transition hover:border-[hsl(var(--panel-border)/0.9)]"
          >
            Back home
          </Link>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <DbStatusBanner />
          <header className="flex items-center justify-between border-b op-border px-6 py-4">
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
                <span className="rounded-full border border-amber-400/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-200">
                  Auth Disabled
                </span>
              ) : (
                <Link
                  href="/logout"
                  className="rounded-full border op-border px-3 py-1 text-xs op-muted transition hover:border-[hsl(var(--panel-border)/0.9)]"
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
