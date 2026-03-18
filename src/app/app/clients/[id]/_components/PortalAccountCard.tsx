"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Check, Link2, UserCheck, UserX, Loader2 } from "lucide-react";

interface PendingInvite {
  id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface PortalStatus {
  hasAccount: boolean;
  accountCreatedAt: string | null;
  pendingInvites: PendingInvite[];
}

interface InviteResponse {
  token: string;
  inviteUrl: string;
  expiresAt: string;
}

export function PortalAccountCard({ clientId }: { clientId: string }) {
  const [status, setStatus] = useState<PortalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newInvite, setNewInvite] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch portal status:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleGenerateInvite() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/invite`, {
        method: "POST",
      });
      if (res.ok) {
        const data: InviteResponse = await res.json();
        setNewInvite(data);
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to generate invite:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div style={{ borderRadius: 12, border: "1px solid var(--stone-mid)", background: "var(--bark-mid)", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--stone-lightest)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading portal status...
        </div>
      </div>
    );
  }

  if (!status) return null;

  // Active account
  if (status.hasAccount) {
    return (
      <div style={{ borderRadius: 12, border: "1px solid var(--stone-mid)", background: "var(--bark-mid)", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <UserCheck className="w-5 h-5" style={{ color: "var(--garnet-ruby)" }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: "var(--stone-lightest)" }}>
                Client Portal
              </p>
              {status.accountCreatedAt && (
                <p style={{ fontSize: 11, color: "var(--stone-warm)", marginTop: 2 }}>
                  Joined {new Date(status.accountCreatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", borderRadius: 999,
            background: "rgba(68,6,6,0.15)", border: "1px solid rgba(117,18,18,0.4)",
            padding: "2px 10px", fontSize: 11, fontWeight: 500, color: "var(--garnet-ruby)"
          }}>
            Portal Active
          </span>
        </div>
      </div>
    );
  }

  // Invite URL display helper
  const renderInviteUrl = (url: string, expiresDate: string) => (
    <div style={{ borderRadius: 12, border: "1px solid var(--stone-mid)", background: "var(--bark-mid)", padding: 20, display: "flex", flexDirection: "column" as const, gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link2 className="w-5 h-5" style={{ color: "var(--garnet-blush)" }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: "var(--stone-lightest)" }}>
              Client Portal
            </p>
            <p style={{ fontSize: 11, color: "var(--stone-warm)", marginTop: 2 }}>
              Invite expires {expiresDate}
            </p>
          </div>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", borderRadius: 999,
          background: "rgba(68,6,6,0.12)", border: "1px solid rgba(155,69,69,0.3)",
          padding: "2px 10px", fontSize: 11, fontWeight: 500, color: "var(--garnet-blush)"
        }}>
          Invite Pending
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          readOnly
          value={url}
          style={{
            flex: 1, borderRadius: 8, border: "1px solid var(--stone-mid)",
            background: "var(--bark)", padding: "6px 12px", fontSize: 11,
            color: "var(--stone-lightest)", fontFamily: "monospace",
            overflow: "hidden", textOverflow: "ellipsis", outline: "none"
          }}
        />
        <button
          onClick={() => copyToClipboard(url)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8,
            border: "1px solid var(--stone-mid)", background: "var(--bark)",
            padding: "6px 12px", fontSize: 11, color: "var(--stone-lightest)",
            cursor: "pointer"
          }}
        >
          {copied ? <Check className="w-3.5 h-3.5" style={{ color: "var(--blue)" }} /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );

  // Pending invite exists
  const latestPending = status.pendingInvites[0];
  if (latestPending && !newInvite) {
    const inviteUrl = `${window.location.origin}/client/join?code=${latestPending.token}`;
    return renderInviteUrl(inviteUrl, new Date(latestPending.expires_at).toLocaleDateString());
  }

  // New invite just generated
  if (newInvite) {
    return renderInviteUrl(newInvite.inviteUrl, new Date(newInvite.expiresAt).toLocaleDateString());
  }

  // No account, no pending invite
  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--stone-mid)", background: "var(--bark-mid)", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <UserX className="w-5 h-5" style={{ color: "var(--stone-warm)" }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: "var(--stone-lightest)" }}>
              Client Portal
            </p>
            <p style={{ fontSize: 11, color: "var(--stone-warm)", marginTop: 2 }}>No portal account</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleGenerateInvite}
            disabled={generating}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8,
              background: "var(--garnet)", border: "none",
              padding: "6px 14px", fontSize: 11, fontWeight: 500,
              color: "var(--stone-lightest)", cursor: "pointer",
              opacity: generating ? 0.5 : 1
            }}
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            Generate Invite Link
          </button>
        </div>
      </div>
    </div>
  );
}
