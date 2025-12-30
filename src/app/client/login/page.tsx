"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [origin, setOrigin] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrigin(window.location.origin);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!email.trim()) return;
    if (!origin) return;

    setStatus("sending");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/client/auth/callback`,
        },
      });
      if (signInError) {
        throw signInError;
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to send link.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Client Login
        </p>
        <h2 className="text-2xl font-semibold">Sign in to your portal</h2>
        <p className="mt-2 text-sm text-slate-300">
          We&apos;ll email a magic link so you can access your updates.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
      >
        <label className="block text-sm text-slate-200">
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="you@example.com"
            required
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending..." : "Send magic link"}
          </button>
          <Link
            href="/client"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Back to portal
          </Link>
        </div>

        {status === "sent" ? (
          <p className="mt-3 text-sm text-emerald-200">
            Link sent. Check your inbox to finish sign-in.
          </p>
        ) : null}
        {status === "error" && error ? (
          <p className="mt-3 text-sm text-rose-200">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
