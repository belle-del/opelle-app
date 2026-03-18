"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type JoinStep = "code" | "account";

type CodeResult = {
  type: "stylist_code" | "salon_code" | "booking_code";
  workspaceId: string;
  stylistId?: string;
  workspaceName?: string;
  stylistName?: string;
  clientId?: string;
  inviteId?: string;
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

export default function JoinPage() {
  const [step, setStep] = useState<JoinStep>("code");
  const [code, setCode] = useState("");
  const [codeResult, setCodeResult] = useState<CodeResult | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/client/auth/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }

      setCodeResult(data);
      setStep("account");
    } catch {
      setError("Something went wrong — try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!firstName.trim()) {
      setError("Please enter your first name");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Store join data in cookie before redirecting to Google
      // The callback will read this cookie after OAuth completes
      document.cookie = `opelle_join_data=${encodeURIComponent(
        JSON.stringify({
          workspaceId: codeResult!.workspaceId,
          stylistId: codeResult!.stylistId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          inviteId: codeResult!.inviteId,
          existingClientId: codeResult!.clientId,
        })
      )}; path=/; max-age=3600; SameSite=Lax`;

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
      // If no error, browser will redirect — keep loading state
    } catch {
      setError("Something went wrong — try again");
      setLoading(false);
    }
  }

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
            Your beauty experience, personalized
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6">
            {step === "code" && (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <h2
                    className="text-lg mb-1"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--text-on-stone)" }}
                  >
                    Enter your code
                  </h2>
                  <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)" }}>
                    Your stylist should have shared a code with you
                  </p>
                </div>

                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. OPL4XZ"
                  maxLength={10}
                  className="text-center tracking-widest"
                  style={{ fontSize: "20px", fontFamily: "monospace", letterSpacing: "0.2em", padding: "14px" }}
                  autoFocus
                />

                {error && (
                  <p style={{ color: "var(--garnet)", fontSize: "13px", textAlign: "center" }}>{error}</p>
                )}

                <Button type="submit" disabled={!code.trim() || loading} className="w-full" size="lg">
                  {loading ? "Checking..." : "Continue"}
                </Button>

                <div className="text-center mt-4">
                  <a
                    href="/client/login"
                    style={{ color: "var(--brass)", fontSize: "13px", textDecoration: "none" }}
                  >
                    Already have an account? Sign in
                  </a>
                </div>
              </form>
            )}

            {step === "account" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2
                    className="text-lg mb-1"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--text-on-stone)" }}
                  >
                    Create your account
                  </h2>
                  {codeResult?.stylistName && (
                    <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)" }}>
                      with {codeResult.stylistName}
                    </p>
                  )}
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)", textAlign: "center" }}>
                  What name should your stylist see?
                </p>

                <div className="space-y-3">
                  <Input
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setError(""); }}
                    placeholder="First name"
                    required
                    autoFocus
                  />
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>

                {error && (
                  <p style={{ color: "var(--garnet)", fontSize: "13px", textAlign: "center" }}>{error}</p>
                )}

                {/* Google sign-in button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={!firstName.trim() || loading}
                  className="w-full flex items-center justify-center gap-3 rounded-lg transition-all"
                  style={{
                    background: loading || !firstName.trim() ? "rgba(255,255,255,0.5)" : "#fff",
                    color: "#3c4043",
                    border: "1px solid #dadce0",
                    padding: "11px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: loading || !firstName.trim() ? "not-allowed" : "pointer",
                    opacity: loading || !firstName.trim() ? 0.6 : 1,
                  }}
                >
                  {!loading && <GoogleIcon />}
                  {loading ? "Redirecting to Google..." : "Continue with Google"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("code"); setError(""); }}
                  className="w-full text-center"
                  style={{ color: "var(--text-on-stone-faint)", fontSize: "13px", background: "none", border: "none", cursor: "pointer", padding: "8px" }}
                >
                  Back
                </button>
              </div>
            )}
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
