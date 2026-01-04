import Link from "next/link";
import type { ReactNode } from "react";

type LinkCardProps = {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
};

export default function LinkCard({
  title,
  description,
  href,
  icon,
}: LinkCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full w-full flex-col justify-between rounded-2xl border border-[hsl(var(--panelBorder)/0.7)] bg-[hsl(var(--panel)/0.75)] p-6 text-left text-[hsl(var(--fg))] shadow-[var(--shadow)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] hover:-translate-y-1 hover:border-[hsl(var(--accent-1))] hover:bg-[hsl(var(--panel)/0.9)]"
    >
      <div>
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="rounded-full border border-[hsl(var(--panelBorder)/0.7)] bg-[hsl(var(--bg)/0.9)] p-2 text-[hsl(var(--fg))]">
              {icon}
            </span>
          ) : null}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <p className="mt-3 text-sm op-muted">{description}</p>
      </div>
      <span className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--accent-1))]">
        Open
      </span>
    </Link>
  );
}
