import Link from "next/link";
import AppNav from "@/app/app/_components/AppNav";
import NewItemMenu from "@/app/app/_components/NewItemMenu";
import DbStatusBanner from "@/app/app/_components/DbStatusBanner";
import { isDbConfigured } from "@/lib/db/health";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authDisabled = process.env.OPPELLE_AUTH_DISABLED === "true";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900/60 p-6 lg:flex">
          <div className="text-lg font-semibold tracking-tight">
            Student Console
          </div>
          <AppNav />
          <Link
            href="/"
            className="mt-auto rounded-lg border border-slate-700 px-3 py-2 text-center text-sm text-slate-200 transition hover:border-slate-500"
          >
            Back home
          </Link>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <DbStatusBanner dbConfigured={isDbConfigured()} />
          <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Opelle
              </p>
              <h1 className="text-xl font-semibold">Student Console</h1>
            </div>
            <div className="flex items-center gap-3">
              <NewItemMenu />
              {authDisabled ? (
                <span className="rounded-full border border-amber-400/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-200">
                  Auth Disabled
                </span>
              ) : (
                <Link
                  href="/logout"
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-slate-500"
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
