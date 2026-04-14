"use client";

import { OnboardingProgress } from "./OnboardingProgress";

export function OnboardingLayout({
  currentStep,
  totalSteps,
  children,
}: {
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--stone-lightest)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-light tracking-wide"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "var(--olive)",
            }}
          >
            Opelle
          </h1>
        </div>

        <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />

        <div
          className="rounded-lg p-8"
          style={{
            background: "white",
            border: "1px solid var(--stone-mid)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
