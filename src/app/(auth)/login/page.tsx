"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setStatus(error.message);
      } else {
        setStatus("Check your email for the magic link.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatus(message);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-md space-y-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Opelle Auth
          </p>
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="text-slate-300">
            Use a magic link to access the student console.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
        >
          <label className="block text-sm text-slate-200">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
              placeholder="you@opelle.co"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {loading ? "Sending..." : "Send magic link"}
          </button>
          {status ? (
            <p className="text-sm text-slate-300">{status}</p>
          ) : null}
        </form>

        <Link
          href="/"
          className="text-sm text-slate-400 transition hover:text-slate-200"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
