import Link from "next/link";

const navItems = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/appointments", label: "Appointments" },
  { href: "/app/formulas", label: "Formulas" },
  { href: "/app/education", label: "Education" },
  { href: "/app/settings", label: "Settings" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900/60 p-6 lg:flex">
          <div className="text-lg font-semibold tracking-tight">Student Console</div>
          <nav className="mt-8 flex flex-1 flex-col gap-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/(auth)/logout"
            className="mt-auto rounded-lg border border-slate-700 px-3 py-2 text-center text-sm text-slate-200 transition hover:border-slate-500"
          >
            Logout
          </Link>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Opelle
              </p>
              <h1 className="text-xl font-semibold">Student Console</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/(auth)/logout"
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Logout
              </Link>
            </div>
          </header>

          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
