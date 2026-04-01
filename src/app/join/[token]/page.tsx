"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<{ role: string; workspaceName: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check auth
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  // Fetch invite details
  useEffect(() => {
    if (!token) return;
    fetch(`/api/team/invite/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid or expired invite");
        return res.json();
      })
      .then(setInvite)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (isLoggedIn === false) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/join/${token}`);
      return;
    }

    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invite");
        return;
      }
      router.push(data.redirectTo || "/app");
    } catch {
      setError("Network error");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#1f231a", padding: "24px",
    }}>
      <div style={{
        width: "400px", maxWidth: "100%", background: "rgba(241,239,224,0.04)",
        borderRadius: "12px", border: "1px solid rgba(196,171,112,0.12)",
        padding: "32px", textAlign: "center",
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: "20px",
          letterSpacing: "0.2em", textTransform: "uppercase", color: "#F1EFE0",
          fontWeight: 400, marginBottom: "4px",
        }}>
          OPELLE
        </h1>
        <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#C4AB70", marginBottom: "24px" }}>
          Team Invite
        </p>

        {loading && (
          <p style={{ fontSize: "13px", color: "rgba(241,239,224,0.5)" }}>Loading invite...</p>
        )}

        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: "8px", background: "rgba(196,122,122,0.1)",
            border: "1px solid rgba(196,122,122,0.2)", color: "#C47A7A", fontSize: "13px",
            marginBottom: "16px",
          }}>
            {error}
          </div>
        )}

        {invite && !error && (
          <>
            <p style={{ fontSize: "14px", color: "#F1EFE0", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>
              You&apos;ve been invited to join
            </p>
            <p style={{ fontSize: "20px", color: "#C4AB70", fontFamily: "'Fraunces', serif", fontWeight: 300, marginBottom: "8px" }}>
              {invite.workspaceName}
            </p>
            <p style={{ fontSize: "12px", color: "rgba(241,239,224,0.5)", marginBottom: "24px" }}>
              as <span style={{ color: "#F1EFE0", textTransform: "capitalize" }}>{invite.role.replace("_", " ")}</span>
            </p>

            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                width: "100%", padding: "12px 24px", borderRadius: "8px",
                border: "none", background: "#440606", color: "#F1EFE0",
                fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500, opacity: accepting ? 0.6 : 1,
              }}
            >
              {isLoggedIn === false
                ? "Sign in to Accept"
                : accepting
                ? "Accepting..."
                : "Accept Invite"}
            </button>

            <p style={{ fontSize: "10px", color: "rgba(241,239,224,0.3)", marginTop: "12px" }}>
              Expires {new Date(invite.expiresAt).toLocaleDateString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
