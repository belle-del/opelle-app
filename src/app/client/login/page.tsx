"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Something went wrong with the sign-in link. Try again.",
  auth_failed: "Sign-in link expired or already used. Request a new one.",
  link_failed: "Couldn't link your account. Try again or contact your stylist.",
  no_account: "No account found for that email. Enter your stylist's code first.",
};

function ClientLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/client/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong — try again");
    } finally {
      setLoading(false);
    }
  }

  const showNoAccountError = searchParams.get("error") === "no_account";

  return (
    <>
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-4">
            <h2
              className="text-lg mb-1"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--text-on-stone)" }}
            >
              Sign in
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)" }}>
              We&apos;ll send you a sign-in link
            </p>
          </div>

          <Input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="Email address"
            required
            autoFocus
          />

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
                style={{
                  color: "var(--brass)",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                → Enter your stylist code to get started
              </a>
            </div>
          )}

          <Button
            type="submit"
            disabled={!email.trim() || loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Sending..." : "Send sign-in link"}
          </Button>

          <div className="text-center mt-4">
            <a
              href="/client/join"
              style={{ color: "var(--brass)", fontSize: "13px", textDecoration: "none" }}
            >
              New here? Enter your stylist code
            </a>
          </div>
        </form>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div
            className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: "var(--brass-soft)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h2
            className="text-lg"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--text-on-stone)" }}
          >
            Check your email
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)", lineHeight: "1.5" }}>
            We sent a sign-in link to <strong style={{ color: "var(--text-on-stone)" }}>{email}</strong>
          </p>
          <button
            type="button"
            onClick={() => { setSent(false); setEmail(""); }}
            className="mt-2"
            style={{ color: "var(--brass)", fontSize: "13px", background: "none", border: "none", cursor: "pointer" }}
          >
            Try a different email
          </button>
        </div>
      )}
    </>
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
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "var(--stone-shadow)",
              textDecoration: "none",
            }}
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
