"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function OnboardingInviteCode({
  context,
  onSubmit,
  onSkip,
  onBack,
}: {
  context: "student" | "employee";
  onSubmit: (code: string) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      setError("Please enter a valid invite code");
      return;
    }
    setError("");
    onSubmit(trimmed);
  }

  return (
    <div>
      <h2
        className="text-xl mb-1 font-normal"
        style={{
          fontFamily: "'Fraunces', serif",
          color: "var(--olive)",
        }}
      >
        Enter your invite code
      </h2>
      <p
        className="text-sm mb-6"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        {context === "student"
          ? "Your school should have given you a code to join."
          : "Ask your salon manager for the team invite code."}
      </p>

      <div className="mb-4">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="e.g. ABCD1234"
          maxLength={10}
          className="w-full rounded-lg p-3 text-center text-lg tracking-widest font-mono"
          style={{
            background: "var(--stone-lightest)",
            border: error
              ? "1px solid var(--garnet)"
              : "1px solid var(--stone-mid)",
            fontFamily: "'DM Sans', sans-serif",
            color: "var(--text-on-stone)",
            outline: "none",
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = "var(--brass)";
          }}
          onBlur={(e) => {
            if (!error) e.currentTarget.style.borderColor = "var(--stone-mid)";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        {error && (
          <p
            className="text-xs mt-2"
            style={{ color: "var(--garnet)", fontFamily: "'DM Sans', sans-serif" }}
          >
            {error}
          </p>
        )}
      </div>

      <Button onClick={handleSubmit} className="w-full" size="lg">
        Join
      </Button>

      <button
        onClick={onSkip}
        className="mt-3 text-xs w-full text-center underline"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        Don&apos;t have a code? Continue without one
      </button>

      <button
        onClick={onBack}
        className="mt-2 text-xs w-full text-center"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        &larr; Back
      </button>
    </div>
  );
}
