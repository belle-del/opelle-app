"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/appointments", label: "Appointments" },
  { href: "/app/formulas", label: "Formulas" },
  { href: "/app/education", label: "Education" },
  { href: "/app/settings", label: "Settings" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex flex-1 flex-col gap-2 text-sm">
      {navItems.map((item) => {
        const isActive =
          item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 transition ${
              isActive
                ? "bg-emerald-500/20 text-emerald-200"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
