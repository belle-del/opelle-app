"use client";

import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Student Console
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">Sign in</h1>
        <p className="mt-2 text-sm text-slate-300">
          Continue with Google to access your workspace.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white"
        >
          Sign in with Google
        </button>
      </div>

      <div className="text-sm text-slate-400">
        <Link href="/" className="text-emerald-200">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
