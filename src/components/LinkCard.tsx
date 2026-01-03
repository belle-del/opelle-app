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
      className="group flex h-full w-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-left text-slate-100 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 hover:border-emerald-400/60 hover:bg-slate-900/80"
    >
      <div>
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-200">
              {icon}
            </span>
          ) : null}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <p className="mt-3 text-sm text-slate-300">{description}</p>
      </div>
      <span className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
        Open
      </span>
    </Link>
  );
}
