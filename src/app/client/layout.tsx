import Link from "next/link";
import { flags } from "@/lib/flags";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-5 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Opelle Client
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">Client Portal</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-600"
          >
            Back to Opelle
          </Link>
        </div>
      </header>

      {!flags.CLIENT_PORTAL_ENABLED ? (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
          Client portal access is currently disabled.
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-800 px-5 py-6 text-xs text-slate-400 sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
          <p>For appointment updates, contact your stylist directly.</p>
          <nav className="flex flex-wrap gap-3 text-slate-300">
            <Link href="/client" className="transition hover:text-slate-100">
              Home
            </Link>
            <Link
              href="/client/profile"
              className="transition hover:text-slate-100"
            >
              Profile
            </Link>
            <Link
              href="/client/rebook"
              className="transition hover:text-slate-100"
            >
              Rebook
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
