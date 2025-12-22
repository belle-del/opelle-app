import Link from "next/link";

export default function HomePage() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown";
  const env = process.env.VERCEL_ENV ?? "unknown";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Opelle Platform
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Opelle is live ✅
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Your student console and client portal are ready for stitching in
            Supabase auth, local AI stubs, and dashboard workflows.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/app"
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Open Student Console
          </Link>
          <Link
            href="/client"
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Open Client Portal
          </Link>
          <Link
            href="/"
            className="rounded-full border border-emerald-500/60 px-5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400"
          >
            Home
          </Link>
        </div>

        <div className="text-xs text-slate-400">
          <p>Deploy check: commit {commit} • env {env}</p>
          <p>Health: /api/health</p>
        </div>
      </div>
    </main>
  );
}
