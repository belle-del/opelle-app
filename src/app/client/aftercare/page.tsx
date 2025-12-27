"use client";

import { useMemo, useState } from "react";

export default function ClientAftercarePage() {
  const [status, setStatus] = useState<string | null>(null);

  const template = useMemo(
    () => `Opelle Aftercare Plan

What we did today
- Customized service tailored to your goals.
- Focused on maintaining scalp and hair health.

Do
- Use a gentle, sulfate-free cleanser.
- Apply heat protectant before styling.
- Book your follow-up within 6-8 weeks.

Don't
- Over-wash for the first 48 hours.
- Use high heat without protection.

Product suggestions
- Hydrating mask (1-2x weekly)
- Lightweight leave-in conditioner

When to come back
- 6-8 weeks for refresh or adjustment.`,
    []
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Unable to copy. Please select and copy manually.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Aftercare plan</h2>
        <p className="text-slate-300">
          Review the care steps your stylist recommends between visits.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <h3 className="text-lg font-semibold">What we did today</h3>
        <p className="mt-2 text-slate-300">
          Customized service tailored to your goals. We focused on maintaining
          scalp and hair health.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Do</h4>
            <ul className="mt-2 space-y-1 text-slate-300">
              <li>Use a gentle, sulfate-free cleanser.</li>
              <li>Apply heat protectant before styling.</li>
              <li>Book your follow-up within 6-8 weeks.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Don&apos;t</h4>
            <ul className="mt-2 space-y-1 text-slate-300">
              <li>Over-wash for the first 48 hours.</li>
              <li>Use high heat without protection.</li>
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
            6-8 weeks for a refresh or adjustment.
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
