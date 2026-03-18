"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

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

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<JoinStep>("code");
  const [code, setCode] = useState("");
  const [codeResult, setCodeResult] = useState<CodeResult | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // 1. Create account on server (admin creates user + client + link)
      const res = await fetch("/api/client/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          workspaceId: codeResult!.workspaceId,
          stylistId: codeResult!.stylistId,
          inviteId: codeResult!.inviteId,
          existingClientId: codeResult!.clientId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      // 2. Immediately sign in with the new credentials
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.error("[join] Sign-in after signup failed:", signInError.message);
        // Account was created, just redirect to login
        router.push("/client/login?created=true");
        return;
      }

      // 3. Go straight to portal — no magic link needed!
      router.push("/client");
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
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-on-stone-faint)" }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-on-stone-ghost)", marginTop: "2px" }}>
                    At least 6 characters
                  </p>
                </div>

                {error && (
                  <p style={{ color: "var(--garnet)", fontSize: "13px", textAlign: "center" }}>{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={!firstName.trim() || !email.trim() || !password || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Creating account..." : "Create account"}
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
