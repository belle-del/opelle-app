"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createSupabaseBrowserClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bark-deepest)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle warm glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage: `radial-gradient(ellipse at 50% 30%, rgba(196,171,112,0.5) 0%, transparent 50%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "380px",
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "32px",
                fontWeight: 300,
                color: "var(--stone-lightest)",
                letterSpacing: "-0.01em",
                marginBottom: "8px",
              }}
            >
              Opelle
            </h1>
          </Link>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "var(--stone-shadow)",
            }}
          >
            Sign in to your practice
          </p>
        </div>

        {/* Login card */}
        <div
          style={{
            background: "rgba(241, 239, 224, 0.04)",
            border: "1px solid rgba(241, 239, 224, 0.08)",
            borderRadius: "16px",
            padding: "32px 28px",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={handleGoogleLogin}
            className="google-login-btn"
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: "10px",
              border: "1px solid rgba(241, 239, 224, 0.12)",
              background: "rgba(241, 239, 224, 0.06)",
              color: "var(--stone-lightest)",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              transition: "all 0.2s ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#4285F4"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#34A853"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              margin: "24px 0",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "rgba(241, 239, 224, 0.08)" }} />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--stone-shadow)",
              }}
            >
              Secure authentication
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(241, 239, 224, 0.08)" }} />
          </div>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              color: "rgba(155, 152, 143, 0.6)",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "var(--stone-shadow)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "color 0.2s",
            }}
            className="back-link"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>

      {/* Hover styles */}
      <style>{`
        .google-login-btn:hover {
          background: rgba(241, 239, 224, 0.10) !important;
          border-color: rgba(241, 239, 224, 0.18) !important;
          transform: translateY(-1px);
        }
        .back-link:hover {
          color: var(--stone-lightest) !important;
        }
      `}</style>
    </main>
  );
}
