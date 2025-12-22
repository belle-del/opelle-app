import Link from "next/link";
import { flags } from "@/lib/flags";

const clientNav = [
  { href: "/client", label: "Overview" },
  { href: "/client/intake", label: "Intake" },
  { href: "/client/aftercare", label: "Aftercare" },
  { href: "/client/rebook", label: "Rebook" },
  { href: "/client/profile", label: "Profile" },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Client Portal
          </p>
          <h1 className="text-2xl font-semibold">Welcome to Opelle</h1>
          <nav className="flex flex-wrap gap-3 text-sm text-slate-300">
            {clientNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-800 px-4 py-2 transition hover:border-slate-500"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {!flags.CLIENT_PORTAL_ENABLED ? (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
          Client portal access is currently disabled.
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
