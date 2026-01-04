import Link from "next/link";
import { flags } from "@/lib/flags";
import { ClientAuthProvider } from "@/lib/portal/authContext";
import { TokenProvider } from "@/lib/portal/tokenContext";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen op-bg">
      <header className="border-b op-border px-5 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] op-muted">
              Opelle Client
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl op-title">
              Client Portal
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="rounded-full border op-border px-3 py-1 text-xs op-muted transition hover:border-[hsl(var(--panel-border)/0.9)]"
            >
              Back to Opelle
            </Link>
          </div>
        </div>
      </header>

      {!flags.CLIENT_PORTAL_ENABLED ? (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
          Client portal access is currently disabled.
        </div>
      ) : null}

      <ClientAuthProvider>
        <TokenProvider>
          <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
            {children}
          </main>
        </TokenProvider>
      </ClientAuthProvider>

      <footer className="border-t op-border px-5 py-6 text-xs op-muted sm:px-8">
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
