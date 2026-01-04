"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const items = [
  { href: "/app/clients/new", label: "New Client" },
  { href: "/app/appointments/new", label: "New Appointment" },
  { href: "/app/formulas/new", label: "New Formula" },
];

export default function NewItemMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-emerald-500/60 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-200 transition hover:border-emerald-400"
      >
        New
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-background p-2 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/80"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
