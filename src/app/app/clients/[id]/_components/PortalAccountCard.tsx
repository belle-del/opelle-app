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
        // Refresh status to show new pending invite
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
      // Fallback for older browsers
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
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/60 p-5">
        <div className="flex items-center gap-2 text-sm text-stone-400">
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
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium font-[family-name:var(--font-dm-sans)]">
                Client Portal
              </p>
              {status.accountCreatedAt && (
                <p className="text-xs text-stone-400 mt-0.5">
                  Joined {new Date(status.accountCreatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-amber-900/40 border border-amber-700/50 px-2.5 py-0.5 text-xs font-medium text-amber-500">
            Portal Active
          </span>
        </div>
      </div>
    );
  }

  // Pending invite exists
  const latestPending = status.pendingInvites[0];
  if (latestPending && !newInvite) {
    const inviteUrl = `${window.location.origin}/client/join?code=${latestPending.token}`;
    const expiresDate = new Date(latestPending.expires_at).toLocaleDateString();

    return (
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-amber-700" />
            <div>
              <p className="text-sm font-medium font-[family-name:var(--font-dm-sans)]">
                Client Portal
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                Invite expires {expiresDate}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-amber-950/40 border border-amber-800/40 px-2.5 py-0.5 text-xs font-medium text-amber-600">
            Invite Pending
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 rounded-lg border border-stone-700/50 bg-stone-800/60 px-3 py-1.5 text-xs text-stone-300 font-mono truncate"
          />
          <button
            onClick={() => copyToClipboard(inviteUrl)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700/50 bg-stone-800/60 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700/60 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  // New invite just generated
  if (newInvite) {
    const expiresDate = new Date(newInvite.expiresAt).toLocaleDateString();

    return (
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-amber-700" />
            <div>
              <p className="text-sm font-medium font-[family-name:var(--font-dm-sans)]">
                Client Portal
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                Invite expires {expiresDate}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-amber-950/40 border border-amber-800/40 px-2.5 py-0.5 text-xs font-medium text-amber-600">
            Invite Pending
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={newInvite.inviteUrl}
            className="flex-1 rounded-lg border border-stone-700/50 bg-stone-800/60 px-3 py-1.5 text-xs text-stone-300 font-mono truncate"
          />
          <button
            onClick={() => copyToClipboard(newInvite.inviteUrl)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700/50 bg-stone-800/60 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700/60 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  // No account, no pending invite
  return (
    <div className="rounded-xl border border-stone-700/50 bg-stone-900/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserX className="w-5 h-5 text-stone-500" />
          <div>
            <p className="text-sm font-medium font-[family-name:var(--font-dm-sans)]">
              Client Portal
            </p>
            <p className="text-xs text-stone-400 mt-0.5">No portal account</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-stone-800/60 border border-stone-700/50 px-2.5 py-0.5 text-xs font-medium text-stone-400">
            No Portal Account
          </span>
          <button
            onClick={handleGenerateInvite}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900/40 border border-amber-700/50 px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-amber-900/60 transition-colors disabled:opacity-50"
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
