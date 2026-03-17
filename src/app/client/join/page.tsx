"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type JoinStep = "code" | "account" | "check_email";

type CodeResult = {
  type: "stylist_code" | "salon_code" | "booking_code";
  workspaceId: string;
  stylistId?: string;
  workspaceName?: string;
  stylistName?: string;
  clientId?: string;
  inviteId?: string;
};

export default function JoinPage() {
  const [step, setStep] = useState<JoinStep>("code");
  const [code, setCode] = useState("");
  const [codeResult, setCodeResult] = useState<CodeResult | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
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

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Also set cookie as backup (works if magic link opens in same browser)
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

      // Sign up with Supabase magic link
      // Join data is stored in user_metadata so it survives cross-browser magic link clicks
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/client/auth/callback`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            join_workspace_id: codeResult!.workspaceId,
            join_stylist_id: codeResult!.stylistId || null,
            join_invite_id: codeResult!.inviteId || null,
            join_existing_client_id: codeResult!.clientId || null,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setStep("check_email");
    } catch {
      setError("Something went wrong — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bark-deepest)" }}
    >
      <div className="w-full max-w-[400px]">
        {/* Logo */}
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

                <Button
                  type="submit"
                  disabled={!code.trim() || loading}
                  className="w-full"
                  size="lg"
                >
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
              <form onSubmit={handleAccountSubmit} className="space-y-4">
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

                <div className="space-y-3">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                    autoFocus
                  />
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                  />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                  />
                </div>

                {error && (
                  <p style={{ color: "var(--garnet)", fontSize: "13px", textAlign: "center" }}>{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={!firstName.trim() || !email.trim() || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Setting up..." : "Continue"}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("code"); setError(""); }}
                  className="w-full text-center"
                  style={{ color: "var(--text-on-stone-faint)", fontSize: "13px", background: "none", border: "none", cursor: "pointer", padding: "8px" }}
                >
                  Back
                </button>
              </form>
            )}

            {step === "check_email" && (
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
                <p style={{ fontSize: "12px", color: "var(--text-on-stone-ghost)" }}>
                  The link will expire in 1 hour
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
