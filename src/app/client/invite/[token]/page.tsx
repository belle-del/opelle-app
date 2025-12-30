"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useClientPacket } from "@/lib/portal/useClientPacket";
import { useClientAuth } from "@/lib/portal/authContext";
import { useToken } from "@/lib/portal/tokenContext";

const MIN_TOKEN_LENGTH = 6;
const TOKEN_KEY = "opelle:client:v1:token";
const PENDING_KEY = "opelle:client:v1:pending_token";

export default function ClientInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = useMemo(() => params?.token ?? "", [params?.token]);
  const { user, loading: authLoading, refresh } = useClientAuth();
  const { setToken } = useToken();
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [origin, setOrigin] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [sending, setSending] = useState(false);
  const { loading, error: packetError, packet } = useClientPacket(
    token || null
  );

  const validateToken = (value: string) => {
    if (value.trim().length < MIN_TOKEN_LENGTH) {
      return "Invite token must be at least 6 characters.";
    }
    return null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (packetError) {
      setError("Invite token is invalid.");
    }
  }, [packetError]);

  useEffect(() => {
    if (!user) return;
    const nextError = validateToken(token);
    if (nextError) {
      setError(nextError);
      return;
    }
    const currentToken =
      typeof user.user_metadata?.invite_token === "string"
        ? user.user_metadata.invite_token
        : "";
    if (currentToken === token) {
      setToken(token);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(PENDING_KEY);
      }
      setClaimStatus("Invite claimed.");
      return;
    }
    if (claiming) return;

    setClaiming(true);
    fetch("/api/client/claim-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Claim failed.");
        }
        setToken(token);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(PENDING_KEY);
        }
        setClaimStatus("Invite claimed. You can continue.");
        refresh();
      })
      .catch((err) => {
        setClaimStatus(null);
        setError(err instanceof Error ? err.message : "Unable to claim invite.");
      })
      .finally(() => setClaiming(false));
  }, [claiming, refresh, setToken, token, user]);

  const handleContinue = () => {
    const nextError = validateToken(token);
    if (nextError) {
      setError(nextError);
      return;
    }
    setError(null);
    router.push("/client");
  };

  const handlePasteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = pasteValue.trim();
    const nextError = validateToken(trimmed);
    if (nextError) {
      setError(nextError);
      return;
    }
    setError(null);
    router.push(`/client/invite/${trimmed}`);
  };

  const handleSendMagicLink = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const nextError = validateToken(token);
    if (nextError) {
      setError(nextError);
      return;
    }
    if (!origin) return;
    setError(null);
    setSending(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PENDING_KEY, token.trim());
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${origin}/client/auth/callback` },
      });
      if (signInError) {
        throw signInError;
      }
      setClaimStatus("Magic link sent. Check your inbox to finish sign-in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send link.");
    } finally {
      setSending(false);
    }
  };

  const isLoggedIn = Boolean(user);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Invite Entry
        </p>
        <h2 className="text-2xl font-semibold">You are almost in</h2>
        <p className="mt-2 text-sm text-slate-300">
          This invite will connect you to your stylist&apos;s portal once
          verified.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
          Verifying invite...
        </div>
      ) : packet ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Invite details
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {packet.stylist.displayName} &middot; {packet.client.firstName}{" "}
            {packet.client.lastName ?? ""}
          </p>
          {packet.nextAppointment ? (
            <p className="mt-2 text-sm text-slate-300">
              Next appointment:{" "}
              {new Date(packet.nextAppointment.startAt).toLocaleString()} •{" "}
              {packet.nextAppointment.serviceName}
            </p>
          ) : null}
          <p className="mt-3 font-mono text-xs text-slate-500">{token}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Invite token
          </p>
          <p className="mt-2 font-mono text-lg text-slate-100">{token}</p>
          <p className="mt-2 text-xs text-slate-400">
            Keep this token handy for future visits.
          </p>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {claimStatus ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {claimStatus}
        </div>
      ) : null}

      {authLoading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
          Checking your session...
        </div>
      ) : isLoggedIn ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Continue to portal
          </button>
          <button
            type="button"
            onClick={() => setShowPaste((prev) => !prev)}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Paste a different invite
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSendMagicLink}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
        >
          <label className="block text-sm text-slate-200">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="you@example.com"
              required
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={sending}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              {sending ? "Sending..." : "Send magic link to claim invite"}
            </button>
            <button
              type="button"
              onClick={() => setShowPaste((prev) => !prev)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Paste a different invite
            </button>
          </div>
        </form>
      )}

      {showPaste ? (
        <form
          onSubmit={handlePasteSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
        >
          <label className="block text-sm text-slate-200">
            Invite token
            <input
              value={pasteValue}
              onChange={(event) => setPasteValue(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Paste token here"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Go to invite
            </button>
            <button
              type="button"
              onClick={() => setShowPaste(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
