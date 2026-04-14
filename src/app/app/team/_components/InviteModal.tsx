"use client";

import { useState } from "react";

const INVITE_ROLES: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "instructor", label: "Instructor" },
  { value: "stylist", label: "Stylist" },
  { value: "student", label: "Student" },
  { value: "front_desk", label: "Front Desk" },
];

export function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [role, setRole] = useState<string>("student");
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, email: email || undefined }),
      });
      const data = await res.json();
      if (data.url) setInviteUrl(data.url);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setInviteUrl(null);
    setEmail("");
    setRole("student");
    setCopied(false);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "420px", maxWidth: "90vw", background: "#FAFAF5", borderRadius: "12px",
        padding: "24px", zIndex: 101, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "#2C2C24", fontWeight: 300, marginBottom: "16px" }}>
          Invite Team Member
        </h3>

        {!inviteUrl ? (
          <>
            <label style={{ display: "block", fontSize: "12px", color: "#5C5A4F", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                border: "1px solid rgba(0,0,0,0.12)", fontSize: "13px", marginBottom: "12px",
                fontFamily: "'DM Sans', sans-serif", background: "#fff",
              }}
            >
              {INVITE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <label style={{ display: "block", fontSize: "12px", color: "#5C5A4F", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="team@example.com"
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "6px",
                border: "1px solid rgba(0,0,0,0.12)", fontSize: "13px", marginBottom: "20px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={handleClose} style={{
                padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff", fontSize: "12px", cursor: "pointer", color: "#5C5A4F",
              }}>
                Cancel
              </button>
              <button onClick={handleGenerate} disabled={loading} style={{
                padding: "8px 16px", borderRadius: "6px", border: "none",
                background: "#440606", color: "#F1EFE0", fontSize: "12px", cursor: "pointer",
                opacity: loading ? 0.6 : 1,
              }}>
                {loading ? "Generating..." : "Generate Invite Link"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: "12px", color: "#5C5A4F", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }}>
              Share this link with your new team member. It expires in 7 days.
            </p>
            <div style={{
              padding: "10px 14px", borderRadius: "8px", background: "rgba(196,171,112,0.08)",
              border: "1px solid rgba(196,171,112,0.2)", display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: "12px", marginBottom: "16px",
            }}>
              <span style={{ fontSize: "11px", color: "#5C5A4F", wordBreak: "break-all", fontFamily: "monospace" }}>
                {inviteUrl}
              </span>
              <button onClick={handleCopy} style={{
                padding: "4px 12px", borderRadius: "6px",
                background: copied ? "rgba(196,171,112,0.2)" : "rgba(196,171,112,0.1)",
                border: "1px solid rgba(196,171,112,0.2)", color: "#C4AB70",
                fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button onClick={handleClose} style={{
              width: "100%", padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff", fontSize: "12px", cursor: "pointer", color: "#5C5A4F",
            }}>
              Done
            </button>
          </>
        )}
      </div>
    </>
  );
}
