"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Something went wrong. Try again.",
  auth_failed: "Sign-in failed. Check your email and password.",
  link_failed: "Couldn't link your account. Try again or contact your stylist.",
  no_account: "No account found for that email. Enter your stylist's code first.",
};

function ClientLoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [justCreated, setJustCreated] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError && ERROR_MESSAGES[urlError]) {
      setError(ERROR_MESSAGES[urlError]);
    }
    if (searchParams.get("created") === "true") {
      setJustCreated(true);
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

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Invalid email or password");
        } else {
          setError(authError.message);
        }
        return;
      }

      // Signed in — go to portal
      router.push("/client");
    } catch {
      setError("Something went wrong — try again");
    } finally {
      setLoading(false);
    }
  }

  const showNoAccountError = searchParams.get("error") === "no_account";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <h2
          className="text-lg mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--text-on-stone)" }}
        >
          Sign in
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-on-stone-faint)" }}>
          Enter your email and password
        </p>
      </div>

      {justCreated && (
        <div
          className="p-3 rounded-lg text-center"
          style={{ background: "rgba(196,171,112,0.08)", border: "1px solid rgba(196,171,112,0.2)" }}
        >
          <p style={{ color: "var(--brass)", fontSize: "13px" }}>
            Account created! Sign in below.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="Email address"
          required
          autoFocus
        />
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Password"
            required
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
        disabled={!email.trim() || !password || loading}
        className="w-full"
        size="lg"
      >
        {loading ? "Signing in..." : "Sign in"}
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
