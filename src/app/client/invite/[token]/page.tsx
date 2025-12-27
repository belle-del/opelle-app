"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClientPacket } from "@/lib/portal/useClientPacket";

const MIN_TOKEN_LENGTH = 6;
const TOKEN_KEY = "opelle:client:v1:token";

export default function ClientInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = useMemo(() => params?.token ?? "", [params?.token]);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    if (packetError) {
      setError("Invite token is invalid.");
    }
  }, [packetError]);

  const handleContinue = () => {
    const nextError = validateToken(token);
    if (nextError) {
      setError(nextError);
      return;
    }
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_KEY, token.trim());
    }
    router.push(`/client?token=${encodeURIComponent(token.trim())}`);
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={Boolean(packetError) || loading}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={() => setShowPaste((prev) => !prev)}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
        >
          Paste a different invite
        </button>
      </div>

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
