"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("sent");
      setMessage("Magic link sent. Check your inbox to continue.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to send magic link.";
      setStatus("error");
      setMessage(errorMessage);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Student Console
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">Sign in</h1>
        <p className="mt-2 text-sm text-slate-300">
          Use your email to receive a secure magic link.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
      >
        <label className="block text-sm text-slate-200">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="you@example.com"
            required
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-4 w-full rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          {status === "loading" ? "Sending..." : "Send magic link"}
        </button>
        {message ? (
          <p
            className={`mt-3 text-sm ${
              status === "error" ? "text-rose-200" : "text-emerald-200"
            }`}
          >
            {message}
          </p>
        ) : null}
      </form>

      <div className="text-sm text-slate-400">
        <Link href="/" className="text-emerald-200">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
