import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-slate-300">
          The page you requested does not exist. Head back to the landing page
          or jump into the console.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Back home
          </Link>
          <Link
            href="/app"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            Student console
          </Link>
        </div>
      </div>
    </main>
  );
}
