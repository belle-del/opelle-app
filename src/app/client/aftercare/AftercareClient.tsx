"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useClientPacket } from "@/lib/portal/useClientPacket";
import { useToken } from "@/lib/portal/tokenContext";
import { useClientAuth } from "@/lib/portal/authContext";

const PENDING_KEY = "opelle:client:v1:pending_token";

export default function AftercareClient() {
  const [status, setStatus] = useState<string | null>(null);
  const { token } = useToken();
  const { user, loading } = useClientAuth();
  const { packet } = useClientPacket(token ?? null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PENDING_KEY);
    setPendingToken(stored);
  }, []);

  const aftercare = packet?.aftercare;

  const template = useMemo(() => {
    const summary =
      aftercare?.summary ??
      "Customized service tailored to your goals. We focused on maintaining scalp and hair health.";
    const doItems = aftercare?.do?.length
      ? aftercare.do
      : [
          "Use a gentle, sulfate-free cleanser.",
          "Apply heat protectant before styling.",
          "Book your follow-up within 6-8 weeks.",
        ];
    const dontItems = aftercare?.dont?.length
      ? aftercare.dont
      : ["Over-wash for the first 48 hours.", "Use high heat without protection."];
    const rebook =
      aftercare?.rebookWindowDays
        ? `${Math.round(aftercare.rebookWindowDays / 7)}-week refresh`
        : "6-8 weeks for refresh or adjustment";

    return `Opelle Aftercare Plan

What we did today
- ${summary}

Do
${doItems.map((item) => `- ${item}`).join("\n")}

Don't
${dontItems.map((item) => `- ${item}`).join("\n")}

Product suggestions
- Hydrating mask (1-2x weekly)
- Lightweight leave-in conditioner

When to come back
- ${rebook}.`;
  }, [aftercare]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Unable to copy. Please select and copy manually.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
        Checking your session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Aftercare plan</h2>
        <p className="text-slate-300">
          Sign in to view your personalized aftercare instructions.
        </p>
        <Link
          href="/client/login"
          className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Claim your invite</h2>
        <p className="text-slate-300">
          Connect your invite link to unlock aftercare details.
        </p>
        {pendingToken ? (
          <Link
            href={`/client/invite/${pendingToken}`}
            className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Continue claim
          </Link>
        ) : (
          <Link
            href="/client/invite/your-invite"
            className="inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Open invite link
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Aftercare plan</h2>
        <p className="text-slate-300">
          Review the care steps your stylist recommends between visits.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          This is a sample aftercare plan. Your stylist may customize it.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <h3 className="text-lg font-semibold">What we did today</h3>
        <p className="mt-2 text-slate-300">
          {aftercare?.summary ??
            "Customized service tailored to your goals. We focused on maintaining scalp and hair health."}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Do</h4>
            <ul className="mt-2 space-y-1 text-slate-300">
              {(aftercare?.do?.length
                ? aftercare.do
                : [
                    "Use a gentle, sulfate-free cleanser.",
                    "Apply heat protectant before styling.",
                    "Book your follow-up within 6-8 weeks.",
                  ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Don&apos;t</h4>
            <ul className="mt-2 space-y-1 text-slate-300">
              {(aftercare?.dont?.length
                ? aftercare.dont
                : [
                    "Over-wash for the first 48 hours.",
                    "Use high heat without protection.",
                  ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-100">
            Product suggestions
          </h4>
          <ul className="mt-2 space-y-1 text-slate-300">
            <li>Hydrating mask (1-2x weekly)</li>
            <li>Lightweight leave-in conditioner</li>
          </ul>
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-100">
            When to come back
          </h4>
          <p className="mt-2 text-slate-300">
            {aftercare?.rebookWindowDays
              ? `About ${Math.round(aftercare.rebookWindowDays / 7)} weeks for a refresh.`
              : "6-8 weeks for a refresh or adjustment."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Copy to clipboard
        </button>
        {status ? <p className="text-sm text-slate-300">{status}</p> : null}
      </div>
    </div>
  );
}
