"use client";

type StylistChoice = "independent" | "employee" | "salon_owner";

const OPTIONS: { value: StylistChoice; label: string; description: string }[] = [
  {
    value: "independent",
    label: "I rent a booth or work independently",
    description: "Solo practitioner, your own clients",
  },
  {
    value: "employee",
    label: "I work at a salon (employee)",
    description: "Part of an existing team",
  },
  {
    value: "salon_owner",
    label: "I own my own salon",
    description: "Running your own business",
  },
];

export function OnboardingStylistFollowup({
  onSelect,
  onBack,
}: {
  onSelect: (choice: StylistChoice) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2
        className="text-xl mb-1 font-normal"
        style={{
          fontFamily: "'Fraunces', serif",
          color: "var(--olive)",
        }}
      >
        How do you work?
      </h2>
      <p
        className="text-sm mb-6"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-on-stone-faint)",
        }}
      >
        This helps us set up the right tools for you.
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full text-left rounded-lg p-4 transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "var(--stone-lightest)",
              border: "1px solid var(--stone-mid)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brass)";
              e.currentTarget.style.background = "var(--brass-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--stone-mid)";
              e.currentTarget.style.background = "var(--stone-lightest)";
            }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: "var(--text-on-stone)" }}
            >
              {opt.label}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-on-stone-faint)" }}
            >
              {opt.description}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-4 text-xs w-full text-center"
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
