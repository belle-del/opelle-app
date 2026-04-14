"use client";

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === currentStep ? 24 : 8,
            height: 8,
            background:
              i <= currentStep
                ? "var(--brass)"
                : "var(--stone-deep)",
          }}
        />
      ))}
    </div>
  );
}
