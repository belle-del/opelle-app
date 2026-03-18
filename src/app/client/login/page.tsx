"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Something went wrong. Try again.",
  auth_failed: "Sign-in failed. Please try again.",
  link_failed: "Couldn't link your account. Try again or contact your stylist.",
  no_account: "No account found. Enter your stylist's code to get started.",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function ClientLoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError && ERROR_MESSAGES[urlError]) {
      setError(ERROR_MESSAGES[urlError]);
    }
    if (searchParams.get("signout") === "true") {
      (async () => {
        try {
          const { createBrowserClient } = await import("@supabase/ssr");
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          await supabase.auth.signOut();
        } catch {
          // silent
        }
      })();
    }
  }, [searchParams]);

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);

    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/client/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
      // Browser redirects — keep loading
    } catch {
      setError("Something went wrong — try again");
      setLoading(false);
    }
  }

  const showNoAccountError = searchParams.get("error") === "no_account";

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2
          className="text-lg mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--text-on-stone)" }}
        >
          Sign in
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)" }}>
          Use your Google account to sign in
        </p>
      </div>

      {error && (
        <p style={{ color: "var(--garnet)", fontSize: "13px", textAlign: "center" }}>{error}</p>
      )}

      {showNoAccountError && (
        <div
          className="p-3 rounded-lg text-center"
          style={{ background: "rgba(196,171,112,0.08)", border: "1px solid rgba(196,171,112,0.2)" }}
        >
          <a
            href="/client/join"
            style={{ color: "var(--brass)", fontSize: "14px", fontWeight: 500, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}
          >
            → Enter your stylist code to get started
          </a>
        </div>
      )}

      {/* Google sign-in button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-lg transition-all"
        style={{
          background: loading ? "rgba(255,255,255,0.5)" : "#fff",
          color: "#3c4043",
          border: "1px solid #dadce0",
          padding: "12px 16px",
          fontSize: "15px",
          fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {!loading && <GoogleIcon />}
        {loading ? "Redirecting to Google..." : "Continue with Google"}
      </button>

      <div className="text-center mt-4">
        <a
          href="/client/join"
          style={{ color: "var(--brass)", fontSize: "13px", textDecoration: "none" }}
        >
          New here? Enter your stylist code
        </a>
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bark-deepest)" }}
    >
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1
            className="text-3xl mb-1"
            style={{ fontFamily: "'Fraunces', serif", color: "var(--stone-lightest)" }}
          >
            Opelle
          </h1>
          <p style={{ color: "var(--stone-shadow)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
            Welcome back
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6">
            <Suspense fallback={<div className="py-8 text-center" style={{ color: "var(--text-on-stone-faint)" }}>Loading...</div>}>
              <ClientLoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <a
            href="/"
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "var(--stone-shadow)", textDecoration: "none" }}
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
