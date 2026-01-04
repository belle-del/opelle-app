"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const origin = window.location.origin;
      const callbackUrl = `${origin}/auth/callback?next=/app`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        console.error("Error logging in:", error.message);
        alert("Login failed: " + error.message);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(1200px 800px at 10% 10%, rgba(226, 232, 240, 0.25), transparent 60%), radial-gradient(800px 600px at 90% 20%, rgba(244, 114, 182, 0.2), transparent 60%), radial-gradient(700px 500px at 30% 80%, rgba(52, 211, 153, 0.18), transparent 60%), radial-gradient(600px 500px at 80% 80%, rgba(168, 85, 247, 0.14), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 6px)",
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-rose-200/30 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="opelle-login-enter w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.4)] backdrop-blur-xl sm:p-10">
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[10px] uppercase tracking-[0.3em] text-white/80">
              <span className="text-emerald-100">Opelle</span>
              <span className="rounded-full bg-rose-200/20 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
                Beta
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Student Console
            </h1>
            <p className="text-sm text-slate-200/80">Student Console (Beta)</p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="group rounded-full bg-gradient-to-r from-emerald-200/70 via-rose-200/60 to-violet-200/70 p-[1px] transition hover:shadow-[0_0_20px_rgba(244,114,182,0.35)]">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-slate-950/90 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-not-allowed disabled:bg-slate-900"
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-20"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-80"
                        d="M22 12a10 10 0 0 0-10-10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing you in…
                  </span>
                ) : (
                  <>
                    <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-slate-200/80">
              Only approved students can access Opelle.
            </p>
            <p className="text-center text-xs text-slate-300">
              Trouble signing in?{" "}
              <a
                href="mailto:support@opelle.app"
                className="text-rose-100 underline underline-offset-4 hover:text-rose-50"
              >
                Contact support
              </a>
              .
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-300">
            <Link
              href="/privacy"
              className="transition hover:text-white"
            >
              Privacy
            </Link>
            <span className="text-slate-500">•</span>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .opelle-login-enter {
          animation: opelle-fade-in 600ms ease forwards;
          opacity: 0;
          transform: translateY(12px);
        }
        @keyframes opelle-fade-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .opelle-login-enter {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
